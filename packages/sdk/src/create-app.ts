import type { ZerithDBConfig, CollectionOptions } from "zerithdb-core";
import { ValidatorRegistry } from "zerithdb-core";
import { Logger } from "zerithdb-core";
import type { Document, Identity, QueryFilter, SyncState } from "zerithdb-core";
export type { Document, Identity, QueryFilter, SyncState, ZerithDBConfig, CollectionOptions };
import { MemoryCollector, estimateStorageBytes } from "zerithdb-devtools";
import { ZerithDBError, ErrorCode } from "zerithdb-core";
import { DbClient, CollectionClient } from "./db-client.js";
import type { CloudBackupTarget, LocalCloudBackupOptions } from "./db-client.js";
import { LocalCloudBackupAdapter } from "./db-client.js";
import { SyncEngine } from "./sync-engine.js";
import { AuthManager } from "./auth-manager.js";
import { NetworkManager } from "./network-manager.js";
import { LLMConflictResolver } from "./conflict-resolution/resolver.js";

/**
 * The root ZerithDB application instance returned by {@link createApp}.
 */
export interface ZerithDBApp {
  /**
   * Access a database collection by name.
   * The collection is created lazily on first use.
   *
   * Optionally pass a `schema` validator (e.g. a Zod schema) to enable
   * runtime document validation before any insert or update.
   *
   * @param name - Collection name (e.g. `"todos"`, `"messages"`)
   * @param options - Optional collection config (e.g. `{ schema: zodSchema }`)
   * @returns A typed {@link CollectionClient} for querying and mutating documents.
   *
   * @example
   * ```typescript
   * import { z } from "zod";
   * const TodoSchema = z.object({ text: z.string(), done: z.boolean() });
   * type Todo = z.infer<typeof TodoSchema>;
   *
   * const todos = app.db<Todo>("todos", { schema: TodoSchema });
   * await todos.insert({ text: "Hello", done: false }); // ✅ valid
   * await todos.insert({ text: "", done: false });       // ❌ throws DB_VALIDATION_FAILED
   * ```
   */
  db<T extends Record<string, any> = Record<string, any>>(
    name: string,
    options?: CollectionOptions<T>
  ): CollectionClient<T>;

  /** CRDT sync engine — manages Yjs documents and P2P update propagation */
  sync: SyncEngine;

  /** Authentication manager — keypair identity and message signing */
  auth: AuthManager;

  /** P2P network manager — WebRTC peer connections and signaling */
  network: NetworkManager;

  /**
   * Create a local cloud backup adapter. The adapter exports configured
   * IndexedDB collections and uploads the JSON snapshot through the target.
   */
  backup(target: CloudBackupTarget, options?: LocalCloudBackupOptions): LocalCloudBackupAdapter;

  /** Underlying app configuration */
  config: Readonly<ZerithDBConfig>;

  /**
   * Tear down the application — close all peer connections, stop sync,
   * and release database handles.
   */
  dispose(): Promise<void>;
}

/**
 * Creates a new ZerithDB application instance.
 *
 * This is the primary entry point to the ZerithDB SDK.
 * All database, sync, auth, and network operations flow through this instance.
 *
 * @param config - Application configuration
 * @returns A configured {@link ZerithDBApp}
 *
 * @example
 * ```typescript
 * import { createApp } from "zerithdb-sdk";
 *
 * const app = createApp({
 *   appId: "my-todo-app",
 *   sync: { signalingUrl: "wss://signal.zerithdb.dev" },
 *   debug: { devtools: true },
 * });
 *
 * await app.db("todos").insert({ text: "Ship ZerithDB v1", done: false });
 * app.sync.enable();
 * ```
 */

function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

export function createApp(config: ZerithDBConfig): ZerithDBApp {
  if (!isIndexedDBAvailable()) {
    throw new ZerithDBError(
      ErrorCode.SDK_NOT_INITIALIZED,
      "IndexedDB is unavailable in this browser environment. ZerithDB requires IndexedDB support. Try disabling private/incognito restrictions or use a supported browser."
    );
  }

  if (!config.appId || config.appId.trim().length === 0) {
    throw new ZerithDBError(
      ErrorCode.SDK_INVALID_CONFIG,
      'createApp requires a non-empty "appId" in config'
    );
  }

  const resolvedConfig: ZerithDBConfig = {
    logLevel: "warn",
    ...config,
    sync: {
      signalingUrl: "wss://signal.zerithdb.dev",
      maxPeers: 10,
      transport: "auto",
      ...config.sync,
    },
    auth: {
      storageKey: "__zerithdb_identity",
      ...config.auth,
    },
    network: {
      autoReconnect: true,
      reconnectDelay: 1000,
      ...config.network,
    },
  };

  const logger = new Logger(resolvedConfig, "SDK");
  logger.info("Initializing ZerithDB app", {
    appId: resolvedConfig.appId,
  });

  const auth = new AuthManager(resolvedConfig);
  const validatorRegistry = new ValidatorRegistry();

  const db = new DbClient(resolvedConfig,auth);
  db.setValidatorRegistry(validatorRegistry);

  const network = new NetworkManager(resolvedConfig, auth);
  const sync = new SyncEngine(resolvedConfig, db, network, validatorRegistry);

  let memoryCollector: MemoryCollector | null = null;

  if (resolvedConfig.debug?.devtools === true) {
    memoryCollector = new MemoryCollector({
      measureIndexedDB: async () => {
        const [totalBytes, dbStats] = await Promise.all([
          estimateStorageBytes(),
          db.getMemoryStats(),
        ]);

        return {
          totalBytes,
          recordCount: dbStats.recordCount,
          collections: dbStats.collections,
        };
      },

      measureWebRTC: () => network.getBufferStats(),
    });

    memoryCollector.start();
  }

  const backupAdapters = new Set<LocalCloudBackupAdapter>();

  // Cache collections so validation schema registration happens only once
  const collectionCache = new Map<string, CollectionClient<any>>();

  return {
    config: Object.freeze(resolvedConfig),

    db<T extends Record<string, any>>(
      name: string,
      options?: CollectionOptions<T>
    ): CollectionClient<T> {
      if (!collectionCache.has(name)) {
        // Register schema BEFORE creating/retrieving collection
        if (options?.validation) {
          validatorRegistry.register(
            name,
            options.validation.schema,
            options.validation.mode ?? "strict"
          );
        }

        collectionCache.set(name, db.collection<T>(name));
      }

      return collectionCache.get(name) as CollectionClient<T>;
    },

    dbClient: db,

    sync,
    auth,
    network,

    backup(target: CloudBackupTarget, options?: LocalCloudBackupOptions): LocalCloudBackupAdapter {
      const adapter = new LocalCloudBackupAdapter(db, target, options);

      backupAdapters.add(adapter);

      return adapter;
    },

    async dispose(): Promise<void> {
      memoryCollector?.stop();

      await Promise.all(Array.from(backupAdapters).map((a) => a.stop()));

      backupAdapters.clear();

      await Promise.all([sync.dispose(), network.dispose(), db.dispose()]);
    },
  };
}
