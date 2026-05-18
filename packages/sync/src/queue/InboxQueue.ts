import { BaseQueue } from "./queue-base.js";
import type { StorageProvider } from "./storage-provider.js";

export class InboxQueue<TPayload = unknown> extends BaseQueue<TPayload> {
  constructor(storage: StorageProvider<TPayload>) {
    super(storage, "inbox");
  }
}
