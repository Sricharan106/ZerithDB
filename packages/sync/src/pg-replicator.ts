import { ZerithDBError, ErrorCode } from "zerithdb-core";

export interface PGReplicationConfig {
  url: string;
  tableMap: Record<string, string>; // PG table name -> ZerithDB collection name
}

export type PGChange = {
  table: string;
  type: "INSERT" | "UPDATE" | "DELETE";
  record: Record<string, any>;
  old_record?: Record<string, any>;
};

/**
 * Replicates PostgreSQL change streams (WAL) into local ZerithDB collections.
 * Typically connects to a server-side relay (e.g. Supabase Realtime).
 */
export class PostgresReplicator {
  private ws: WebSocket | null = null;
  private changeQueue: PGChange[] = [];
  private isProcessing = false;

  constructor(
    private readonly app: { db(name: string): any },
    private readonly config: PGReplicationConfig
  ) {}

  /**
   * Start listening to the PG change stream.
   */
  async start(): Promise<void> {
    if (this.ws) {
      this.stop();
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);
      } catch (err) {
        reject(
          new ZerithDBError(
            ErrorCode.NETWORK_DISCONNECTED,
            `Failed to connect to PG replication stream: ${err}`
          )
        );
        return;
      }

      let isResolved = false;

      this.ws.onopen = () => {
        console.log("ZerithDB: Connected to PG replication stream");
        isResolved = true;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const change = JSON.parse(event.data) as PGChange;
          if (!change || typeof change !== "object" || !change.table || !change.type) {
            return;
          }
          this.queueChange(change);
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onerror = (err) => {
        console.error("ZerithDB: PG replication stream error", err);
        if (!isResolved) {
          reject(
            new ZerithDBError(
              ErrorCode.NETWORK_DISCONNECTED,
              "PG replication stream error during handshake"
            )
          );
        }
      };

      this.ws.onclose = () => {
        console.warn("ZerithDB: PG replication stream closed");
        // Simple auto-reconnect could be implemented here
      };
    });
  }

  /**
   * Stop the replication stream.
   */
  stop(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private queueChange(change: PGChange): void {
    this.changeQueue.push(change);
    if (!this.isProcessing) {
      void this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    while (this.changeQueue.length > 0) {
      const change = this.changeQueue.shift();
      if (change) {
        await this.handlePGChange(change).catch((err) => {
          console.error(`ZerithDB: Unhandled error applying PG change to "${change.table}"`, err);
        });
      }
    }
    this.isProcessing = false;
  }

  private async handlePGChange(change: PGChange): Promise<void> {
    const collectionName = this.config.tableMap[change.table];
    if (!collectionName) return;

    const collection = this.app.db(collectionName);

    try {
      switch (change.type) {
        case "INSERT":
          // We use upsert logic (by falling back to insert if it's new)
          // To preserve the PG _id, we must ensure the local insert doesn't generate a new one if present.
          // Note: The collection client insert needs to respect document._id (which we will fix in db-client)
          await collection.insert(change.record);
          break;
        case "UPDATE":
          const updateId = change.record._id || change.record.id;
          if (updateId) {
            try {
              await collection.update({ _id: updateId } as any, { $set: change.record });
            } catch {
              // If update fails (e.g. document not found locally), we fallback to insert to ensure convergence
              await collection.insert({ ...change.record, _id: updateId });
            }
          }
          break;
        case "DELETE":
          const deleteId = change.old_record?._id || change.old_record?.id;
          if (deleteId) {
            await collection.delete({ _id: deleteId } as any);
          }
          break;
      }
    } catch (err) {
      console.warn(`ZerithDB: Failed to apply PG change to "${collectionName}"`, err);
    }
  }
}
