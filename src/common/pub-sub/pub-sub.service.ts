import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from 'pg';

export const PUBSUB_CHANNELS = {
  CAMPUS_EVENTS: 'campus_events',
  DEPARTMENT_EVENTS: 'department_events',
  HOBBY_EVENTS: 'hobby_events',
  USER_EVENTS: 'user_events',
} as const;

const DEFAULT_RECONNECT_INTERVAL_MS = 5000;

type PendingEvent = {
  channel: string;
  payload: unknown;
};

@Injectable()
export class PubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PubSubService.name);
  private readonly pendingEvents: PendingEvent[] = [];
  private connectionString?: string;
  private publisher?: Client;
  private reconnectTimer?: NodeJS.Timeout;
  private flushTimer?: NodeJS.Timeout;
  private connecting?: Promise<void>;
  private flushingPendingEvents = false;
  private shuttingDown = false;

  onModuleInit() {
    this.connectionString = process.env.PUBSUB_DATABASE_URL;
    if (!this.connectionString) {
      this.logger.warn('PUBSUB_DATABASE_URL is not set; user events disabled');
      return;
    }

    void this.connectWithRetry();
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.disconnectPublisher();
  }

  async publish(channel: string, payload: unknown) {
    this.assertChannel(channel);

    if (!this.publisher) {
      this.enqueuePendingEvent(channel, payload);
      void this.connectWithRetry();
      return;
    }

    try {
      await this.publishEvent(channel, payload);
    } catch {
      this.enqueuePendingEvent(channel, payload);
      this.scheduleReconnect();
    }
  }

  private async connectWithRetry() {
    while (!this.shuttingDown && this.connectionString) {
      try {
        await this.ensureConnected();
        this.logger.log('Pubsub publisher connected');
        void this.flushPendingEvents();
        return;
      } catch (error) {
        this.logger.warn(
          `Pubsub connect failed, retrying: ${(error as Error).message}`,
        );
        await this.delay(this.getReconnectIntervalMs());
      }
    }
  }

  private async ensureConnected() {
    if (this.publisher) return;
    if (!this.connectionString)
      throw new Error('PUBSUB_DATABASE_URL is not set');

    this.connecting ??= this.connectOnce().finally(() => {
      this.connecting = undefined;
    });

    await this.connecting;
  }

  private async connectOnce() {
    await this.disconnectPublisher();

    const publisher = new Client({ connectionString: this.connectionString });
    publisher.on('error', (error: Error) => {
      if (this.shuttingDown) return;
      this.logger.warn(`Pubsub publisher error: ${error.message}`);
      this.scheduleReconnect();
    });
    publisher.on('end', () => {
      if (this.shuttingDown) return;
      this.logger.warn('Pubsub publisher disconnected');
      this.scheduleReconnect();
    });

    await publisher.connect();
    this.publisher = publisher;
    await this.ensureDurableTables();
  }

  private scheduleReconnect() {
    if (this.shuttingDown || this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connectWithRetry();
    }, this.getReconnectIntervalMs());
    void this.disconnectPublisher();
  }

  private async publishEvent(channel: string, payload: unknown) {
    if (!this.publisher) {
      throw new Error('Pubsub publisher is not connected');
    }

    const event = await this.publisher.query<{ id: string }>(
      `
        INSERT INTO pubsub_events (channel, payload)
        VALUES ($1, $2::jsonb)
        RETURNING id
      `,
      [channel, JSON.stringify(payload)],
    );

    try {
      await this.publisher.query('SELECT pg_notify($1, $2)', [
        channel,
        JSON.stringify({ eventId: event.rows[0].id }),
      ]);
    } catch (error) {
      this.logger.warn(
        `Pubsub notify failed for ${channel}: ${(error as Error).message}`,
      );
      this.scheduleReconnect();
    }
  }

  private enqueuePendingEvent(channel: string, payload: unknown) {
    this.pendingEvents.push({ channel, payload });
    this.logger.warn(`Queued pubsub event for retry on ${channel}`);
    this.startFlushTimer();
  }

  private startFlushTimer() {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      void this.flushPendingEvents();
    }, this.getReconnectIntervalMs());
  }

  private stopFlushTimerIfIdle() {
    if (this.pendingEvents.length || !this.flushTimer) return;

    clearInterval(this.flushTimer);
    this.flushTimer = undefined;
  }

  private async flushPendingEvents() {
    if (
      this.flushingPendingEvents ||
      !this.publisher ||
      !this.pendingEvents.length
    ) {
      return;
    }

    this.flushingPendingEvents = true;

    try {
      while (this.pendingEvents.length && this.publisher) {
        const event = this.pendingEvents[0];
        await this.publishEvent(event.channel, event.payload);
        this.pendingEvents.shift();
      }
    } catch (error) {
      this.logger.warn(
        `Pending pubsub flush failed, retrying: ${(error as Error).message}`,
      );
      this.scheduleReconnect();
    } finally {
      this.flushingPendingEvents = false;
      this.stopFlushTimerIfIdle();
    }
  }

  private async disconnectPublisher() {
    const publisher = this.publisher;
    this.publisher = undefined;
    await publisher?.end().catch(() => undefined);
  }

  private async ensureDurableTables() {
    if (!this.publisher) return;

    await this.publisher.query(`
      CREATE TABLE IF NOT EXISTS pubsub_events (
        id BIGSERIAL PRIMARY KEY,
        channel TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.publisher.query(`
      CREATE INDEX IF NOT EXISTS idx_pubsub_events_channel_id
      ON pubsub_events (channel, id)
    `);
    await this.publisher.query(`
      CREATE TABLE IF NOT EXISTS pubsub_offsets (
        consumer_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        last_event_id BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (consumer_id, channel)
      )
    `);
  }

  private assertChannel(channel: string) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(channel)) {
      throw new Error(`Invalid pubsub channel: ${channel}`);
    }
  }

  private getReconnectIntervalMs() {
    const value = Number(process.env.PUBSUB_RECONNECT_INTERVAL_MS);
    return Number.isFinite(value) && value > 0
      ? value
      : DEFAULT_RECONNECT_INTERVAL_MS;
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
