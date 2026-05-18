import type { QueuedMutation } from "./types.js";

export interface StorageProvider<TPayload = unknown> {
  add(mutation: QueuedMutation<TPayload>): Promise<void>;
  get(id: string): Promise<QueuedMutation<TPayload> | undefined>;
  put(mutation: QueuedMutation<TPayload>): Promise<void>;
  delete(id: string): Promise<void>;
  getPending(): Promise<QueuedMutation<TPayload>[]>;
  count(): Promise<number>;
}
