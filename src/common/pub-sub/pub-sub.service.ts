// Module
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient } from 'redis';

// Types
import type { PendingEvent, RedisClient } from '@/types/pub-sub.type';

export const PUBSUB_CHANNELS = {
  CAMPUS_EVENTS: 'beefriends:campus-events',
  DEPARTMENT_EVENTS: 'beefriends:department-events',
  HOBBY_EVENTS: 'beefriends:hobby-events',
  USER_EVENTS: 'beefriends:user-events',
} as const;

const DEFAULT_RECONNECT_INTERVAL_MS = 5000;
const DEFAULT_STREAM_MAXLEN = 10000;

@Injectable()
export class PubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PubSubService.name);
  private readonly pendingEvents: PendingEvent[] = [];
  private redisUrl?: string;
  private publisher?: RedisClient;
  private reconnectTimer?: NodeJS.Timeout;
  private flushTimer?: NodeJS.Timeout;
  private connecting?: Promise<void>;
  private flushingPendingEvents = false;
  private shuttingDown = false;

  onModuleInit() {
    this.redisUrl = process.env.REDIS_URL;
    if (!this.redisUrl) {
      this.logger.warn('REDIS_URL is not set; user events disabled');
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

    if (!this.publisher?.isReady) {
      this.enqueuePendingEvent(channel, payload);
      void this.connectWithRetry();
      return;
    }

    try {
      await this.publishEvent(channel, payload);
    } catch (error) {
      this.logger.warn(
        `Redis publish failed for ${channel}: ${(error as Error).message}`,
      );
      this.enqueuePendingEvent(channel, payload);
      this.scheduleReconnect();
    }
  }

  private async connectWithRetry() {
    while (!this.shuttingDown && this.redisUrl) {
      try {
        await this.ensureConnected();
        this.logger.log('Redis pubsub publisher connected');
        void this.flushPendingEvents();
        return;
      } catch (error) {
        this.logger.warn(
          `Redis pubsub connect failed, retrying: ${(error as Error).message}`,
        );
        await this.delay(this.getReconnectIntervalMs());
      }
    }
  }

  private async ensureConnected() {
    if (this.publisher?.isReady) return;
    if (!this.redisUrl) throw new Error('REDIS_URL is not set');

    this.connecting ??= this.connectOnce().finally(() => {
      this.connecting = undefined;
    });

    await this.connecting;
  }

  private async connectOnce() {
    await this.disconnectPublisher();

    const publisher = createClient({
      url: this.redisUrl,
      socket: {
        reconnectStrategy: (retries) =>
          Math.min(this.getReconnectIntervalMs() * (retries + 1), 30000),
      },
    });
    publisher.on('error', (error: Error) => {
      if (this.shuttingDown) return;
      this.logger.warn(`Redis pubsub publisher error: ${error.message}`);
    });
    publisher.on('end', () => {
      if (this.shuttingDown) return;
      this.logger.warn('Redis pubsub publisher disconnected');
      this.scheduleReconnect();
    });

    await publisher.connect();
    this.publisher = publisher;
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
    if (!this.publisher?.isReady) {
      throw new Error('Redis pubsub publisher is not connected');
    }

    const serializedPayload = JSON.stringify(payload);
    await this.publisher.xAdd(
      channel,
      '*',
      { payload: serializedPayload },
      {
        TRIM: {
          strategy: 'MAXLEN',
          strategyModifier: '~',
          threshold: this.getStreamMaxLen(),
        },
      },
    );
    await this.publisher.publish(channel, serializedPayload);
  }

  private enqueuePendingEvent(channel: string, payload: unknown) {
    this.pendingEvents.push({ channel, payload });
    this.logger.warn(`Queued redis pubsub event for retry on ${channel}`);
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
      !this.publisher?.isReady ||
      !this.pendingEvents.length
    ) {
      return;
    }

    this.flushingPendingEvents = true;

    try {
      while (this.pendingEvents.length && this.publisher?.isReady) {
        const event = this.pendingEvents[0];
        await this.publishEvent(event.channel, event.payload);
        this.pendingEvents.shift();
      }
    } catch (error) {
      this.logger.warn(
        `Pending redis pubsub flush failed, retrying: ${
          (error as Error).message
        }`,
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
    if (!publisher) return;

    await publisher.quit().catch(() => {
      publisher.destroy();
    });
  }

  private assertChannel(channel: string) {
    if (!/^[A-Za-z0-9:_-]+$/.test(channel)) {
      throw new Error(`Invalid redis pubsub channel: ${channel}`);
    }
  }

  private getReconnectIntervalMs() {
    const value = Number(process.env.PUBSUB_RECONNECT_INTERVAL_MS);
    return Number.isFinite(value) && value > 0
      ? value
      : DEFAULT_RECONNECT_INTERVAL_MS;
  }

  private getStreamMaxLen() {
    const value = Number(process.env.REDIS_STREAM_MAXLEN);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_STREAM_MAXLEN;
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
