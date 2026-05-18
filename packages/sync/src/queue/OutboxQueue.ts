import { BaseQueue } from "./queue-base.js";
import type { StorageProvider } from "./storage-provider.js";

export class OutboxQueue<TPayload = unknown> extends BaseQueue<TPayload> {
  constructor(storage: StorageProvider<TPayload>) {
    super(storage, "outbox");
  }
}
