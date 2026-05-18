import { EventEmitter } from "zerithdb-core";
import type { StorageProvider } from "./storage-provider.js";
import type { QueueChange, QueuedMutation, QueuedMutationDirection } from "./types.js";

export type QueueEnqueueInput<TPayload> = {
  type: string;
  collection: string;
  payload: TPayload;
};

type QueueEvents<TPayload> = {
  change: QueueChange<TPayload>;
};

export abstract class BaseQueue<TPayload = unknown> {
  protected readonly storage: StorageProvider<TPayload>;
  private readonly events = new EventEmitter<QueueEvents<TPayload>>();
  protected readonly direction: QueuedMutationDirection;

  constructor(storage: StorageProvider<TPayload>, direction: QueuedMutationDirection) {
    this.direction = direction;
    this.storage = storage;
  }

  onChange(callback: (change: QueueChange<TPayload>) => void): () => void {
    this.events.on("change", callback);
    return () => this.events.off("change", callback);
  }

  async enqueue(input: QueueEnqueueInput<TPayload>): Promise<QueuedMutation<TPayload>> {
    const mutation: QueuedMutation<TPayload> = {
      id: generateId(),
      type: input.type,
      collection: input.collection,
      payload: input.payload,
      timestamp: Date.now(),
      status: "pending",
      retries: 0,
      direction: this.direction,
    };

    await this.storage.add(mutation);
    this.events.emit("change", { action: "enqueue", mutation });
    return mutation;
  }

  async getPending(): Promise<QueuedMutation<TPayload>[]> {
    return this.storage.getPending();
  }

  async acknowledge(id: string): Promise<QueuedMutation<TPayload> | null> {
    const existing = await this.storage.get(id);
    if (!existing) return null;

    const mutation = { ...existing, status: "acknowledged" as const };
    await this.storage.delete(id);
    this.events.emit("change", { action: "acknowledge", mutation });
    return mutation;
  }

  async markFailed(id: string): Promise<QueuedMutation<TPayload> | null> {
    const existing = await this.storage.get(id);
    if (!existing) return null;

    const mutation = {
      ...existing,
      status: "failed" as const,
      retries: existing.retries + 1,
    };
    await this.storage.put(mutation);
    this.events.emit("change", { action: "failed", mutation });
    return mutation;
  }

  async count(): Promise<number> {
    return this.storage.count();
  }
}

function generateId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
