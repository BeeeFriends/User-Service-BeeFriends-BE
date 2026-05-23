import { createClient } from 'redis';

export type PendingEvent = {
  channel: string;
  payload: unknown;
};
export type RedisClient = ReturnType<typeof createClient>;
