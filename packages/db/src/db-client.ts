import Dexie, { type Table, liveQuery } from "dexie";
import { v7 as uuidv7 } from "uuid";
import type {
  ZerithDBConfig,
  Document,
  QueryFilter,
  InsertResult,
  UpdateSpec,
} from "zerithdb-core";
import { ZerithDBError, ErrorCode } from "zerithdb-core";
import { wrapIDBOperation } from "./internal/wrap-idb-operation.js";
import type { BackupExportOptions, BackupSnapshot } from "./backup.js";

const RESERVED_FIELDS = ["_id", "_createdAt", "_updatedAt"];

import { GraphClient } from "./graph-client.js";
import type { GraphNode, GraphEdge } from "zerithdb-core";
/**
 * A handle to a single named collection within the ZerithDB local database.
 * All operations are async and backed by IndexedDB.
 */

export class CollectionClient<T extends Record<string, any> = Record<string, any>> {
  constructor(
    private readonly table: Table<Document<T>>,
    private readonly collectionName: string
  ) {}

  /**
   * Subscribe to changes in the collection.
   * Uses Dexie's liveQuery to reactively notify when documents change.
   *
   * @param callback - Function called with the updated list of all documents
   * @returns An unsubscribe function
   */

  subscribe(callback: (documents: Document<T>[]) => void): () => void {
    const observable = liveQuery(() => this.find());

    const subscription = observable.subscribe({
      next: (docs) => callback(docs),
      error: (err) => console.error(`Error in collection subscription:`, err),
    });

    return () => subscription.unsubscribe();
  }

  /**
   * Insert a document if it doesn't exist, or update it if it does.
   * Automatically manages timestamps.
   * insted of add we use put
   * put() inserts OR replace/update automatically
   */

  private validateDocument(document: unknown): void {
    if (document === null || document === undefined) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Document cannot be null or undefined");
    }

    if (typeof document !== "object" || Array.isArray(document)) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Document must be a valid object");
    }

    if (Object.keys(document as object).length === 0) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Document cannot be empty");
    }

    for (const field of RESERVED_FIELDS) {
      if (field in (document as Record<string, any>)) {
        throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, `Field "${field}" is reserved`);
      }
    }
  }

  private validateFilter(filter: unknown): void {
    if (!filter || typeof filter !== "object" || Array.isArray(filter)) {
      throw new ZerithDBError(ErrorCode.DB_READ_FAILED, "Filter must be a valid object");
    }
  }

  async upsert(document: Partial<T> & { _id?: string }): Promise<InsertResult> {
    if (document === null || document === undefined) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Document cannot be null or undefined");
    }

    if (typeof document !== "object" || Array.isArray(document)) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Document must be a valid object");
    }

    const now = Date.now();
    const id = document._id ?? uuidv7();

    const existing = await this.table.get(id);

    const doc: Document<T> = {
      ...(existing ?? {}),
      ...document,
      _id: id,
      _createdAt: existing?._createdAt ?? now,
      _updatedAt: now,
    } as Document<T>;

    return wrapIDBOperation(
      ErrorCode.DB_WRITE_FAILED,
      `Failed to upsert document in collection "${this.collectionName}"`,
      async () => {
        await this.table.put(doc);
        return { id };
      }
    );
  }

  /**
   * Insert a new document into the collection.
   * Automatically assigns `_id`, `_createdAt`, and `_updatedAt`.
   */

  async insert(document: T): Promise<InsertResult> {
    this.validateDocument(document);

    if (document === null || document === undefined) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Document cannot be null or undefined");
    }
    const now = Date.now();
    const id = uuidv7();

    const doc: Document<T> = {
      ...document,
      _id: id,
      _createdAt: now,
      _updatedAt: now,
    };

    return wrapIDBOperation(
      ErrorCode.DB_WRITE_FAILED,
      `Failed to insert into collection "${this.collectionName}"`,
      async () => {
        await this.table.add(doc);
        return { id };
      }
    );
  }

  /**
   * Insert multiple documents in a single atomic operation.
   */

  async insertMany(documents: T[]): Promise<InsertResult[]> {
    if (!Array.isArray(documents)) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Documents must be an array");
    }

    if (documents.length === 0) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Documents array cannot be empty");
    }

    for (const doc of documents) {
      this.validateDocument(doc);
    }

    const now = Date.now();

    const docs = documents.map((doc) => ({
      ...doc,
      _id: uuidv7(),
      _createdAt: now,
      _updatedAt: now,
    })) as Document<T>[];

    return wrapIDBOperation(
      ErrorCode.DB_WRITE_FAILED,
      `Failed to bulk insert into collection "${this.collectionName}"`,
      async () => {
        await this.table.bulkAdd(docs);
        return docs.map((d) => ({ id: d._id }));
      }
    );
  }

  /**
   * Find documents matching a filter.
   * All filter fields are ANDed together.
   *
   * @example
   * ```typescript
   * const active = await todos.find({ done: false });
   * const high = await todos.find({ priority: { $gte: 3 } });
   * ```
   */

  async find(filter: QueryFilter<T> = {}): Promise<Document<T>[]> {
    this.validateFilter(filter);

    return wrapIDBOperation(
      ErrorCode.DB_READ_FAILED,
      `Failed to query collection "${this.collectionName}"`,
      async () => {
        const all = await this.table.toArray();
        const compiledFilter = this.precompileRegexes(filter);
        return all.filter((doc) => this.matchesFilter(doc, compiledFilter));
      }
    );
  }

  /**
   * Find a single document by its `_id`.
   */

  async findById(id: string): Promise<Document<T> | undefined> {
    if (!id || typeof id !== "string") {
      throw new ZerithDBError(ErrorCode.DB_READ_FAILED, "Document id must be a non-empty string");
    }

    return wrapIDBOperation(
      ErrorCode.DB_READ_FAILED,
      `Failed to get document "${id}" from "${this.collectionName}"`,
      async () => {
        const doc = await this.table.get(id);

        if (!doc) {
          return undefined;
        }

        return doc;
      }
    );
  }

  /**
   * Update documents matching a filter.
   * Returns the number of updated documents.
   */

  async update(filter: QueryFilter<T>, spec: UpdateSpec<T>): Promise<number> {
    this.validateFilter(filter);

    if (!spec || typeof spec !== "object") {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Update spec must be a valid object");
    }

    if (!spec.$set && !spec.$unset) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Update spec must contain $set or $unset");
    }

    return wrapIDBOperation(
      ErrorCode.DB_WRITE_FAILED,
      `Failed to update documents in "${this.collectionName}"`,
      async () => {
        const matches = await this.find(filter);

        if (matches.length === 0) {
          throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "No matching documents found");
        }

        const now = Date.now();

        await this.table.bulkPut(matches.map((doc) => this.applyUpdateSpec(doc, spec, now)));

        return matches.length;
      }
    );
  }

  /**
   * Delete documents matching a filter.
   * Returns the number of deleted documents.
   */

  async delete(filter: QueryFilter<T>): Promise<number> {
    this.validateFilter(filter);

    return wrapIDBOperation(
      ErrorCode.DB_DELETE_FAILED,
      `Failed to delete documents from "${this.collectionName}"`,
      async () => {
        const matches = await this.find(filter);

        if (matches.length === 0) {
          throw new ZerithDBError(ErrorCode.DB_DELETE_FAILED, "No matching documents found");
        }

        await this.table.bulkDelete(matches.map((d) => d._id));

        return matches.length;
      }
    );
  }

  /**
   * Delete every document in the collection.
   */

  async clearAll(): Promise<void> {
    return wrapIDBOperation(
      ErrorCode.DB_DELETE_FAILED,
      `Failed to clear collection "${this.collectionName}"`,
      () => this.table.clear()
    );
  }

  /** Alias for {@link clearAll} */
  async clear(): Promise<void> {
    return this.clearAll();
  }

  /**
   * Count documents matching a filter.
   */
  async count(filter: QueryFilter<T> = {}): Promise<number> {
    return wrapIDBOperation(
      ErrorCode.DB_READ_FAILED,
      `Failed to count documents in "${this.collectionName}"`,
      async () => {
        const compiledFilter = this.precompileRegexes(filter);
        let total = 0;

        await this.table.each((doc) => {
          if (this.matchesFilter(doc, compiledFilter)) {
            total++;
          }
        });

        return total;
      }
    );
  }

  private applyUpdateSpec(doc: Document<T>, spec: UpdateSpec<T>, updatedAt: number): Document<T> {
    const next = {
      ...doc,
      ...(spec.$set ?? {}),
      _updatedAt: updatedAt,
    } as Record<string, any>;

    for (const key of Object.keys(spec.$unset ?? {})) {
      delete next[key];
    }

    next._id = doc._id;
    next._createdAt = doc._createdAt;

    return next as Document<T>;
  }

  private matchesFilter(doc: Document<T>, filter: QueryFilter<T>): boolean {
    const validOperators = ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$regex"];

    for (const [key, condition] of Object.entries(filter)) {
      const fieldValue = (doc as Record<string, any>)[key];

      // Primitive equality matching
      // Example:
      // { age: 10 }
      if (condition === null || typeof condition !== "object" || condition instanceof RegExp) {
        if (fieldValue !== condition) {
          return false;
        }

        continue;
      }

      const conditions = condition as Record<string, any>;

      // Validate supported operators
      for (const op of Object.keys(conditions)) {
        if (op.startsWith("$") && !validOperators.includes(op)) {
          throw new ZerithDBError(ErrorCode.DB_READ_FAILED, `Unsupported query operator: ${op}`);
        }
      }

      const isOperatorObject = Object.keys(conditions).some((k) => k.startsWith("$"));

      // Deep object equality
      // Example:
      // { profile: { name: "john" } }
      if (!isOperatorObject) {
        if (JSON.stringify(fieldValue) !== JSON.stringify(condition)) {
          return false;
        }

        continue;
      }

      // Equality operators
      if ("$eq" in conditions && fieldValue !== conditions.$eq) {
        return false;
      }

      if ("$ne" in conditions && fieldValue === conditions.$ne) {
        return false;
      }

      // Comparison operators
      if ("$gt" in conditions && !(fieldValue > conditions.$gt)) {
        return false;
      }

      if ("$gte" in conditions && !(fieldValue >= conditions.$gte)) {
        return false;
      }

      if ("$lt" in conditions && !(fieldValue < conditions.$lt)) {
        return false;
      }

      if ("$lte" in conditions && !(fieldValue <= conditions.$lte)) {
        return false;
      }

      // Array inclusion operators
      if ("$in" in conditions && !(conditions.$in as unknown[]).includes(fieldValue)) {
        return false;
      }

      if ("$nin" in conditions && (conditions.$nin as unknown[]).includes(fieldValue)) {
        return false;
      if ("$exists" in conditions) {
        const exists = key in doc;

        if (conditions.$exists !== exists) {
          return false;
        }
      }
      if ("$regex" in conditions) {
        if (typeof fieldValue !== "string") {
          return false;
        }

        const regex =
          conditions.$regex instanceof RegExp
            ? conditions.$regex
            : new RegExp(conditions.$regex);

        regex.lastIndex = 0;

        if (!regex.test(fieldValue)) {
          return false;
        }
      }

      // Regular expression matching
      // Handle regex-based matching
      if ("$regex" in conditions) {
        const regex =
          conditions.$regex instanceof RegExp
            ? new RegExp(
                conditions.$regex.source,
                conditions.$regex.flags.replace("g", "").replace("y", "")
              )
            : new RegExp(conditions.$regex);

        // Regex only works on strings
        if (typeof fieldValue !== "string") {
          return false;
        }

        // Exclude document if regex does not match
        if (!regex.test(fieldValue)) {
          return false;
        }
      }
    }

    return true;
  }

  private precompileRegexes(filter: QueryFilter<T>): QueryFilter<T> {
    const compiled: Record<string, any> = {};
    for (const [key, condition] of Object.entries(filter)) {
      if (condition !== null && typeof condition === "object") {
        const conditions = { ...condition } as Record<string, any>;
        const isOperatorObject = Object.keys(conditions).some((k) => k.startsWith("$"));
        if (isOperatorObject && "$regex" in conditions) {
          const regex = conditions["$regex"];
          // Precompile regex and remove stateful flags
          conditions["$regex"] =
            regex instanceof RegExp
              ? new RegExp(regex.source, regex.flags.replace("g", "").replace("y", ""))
              : new RegExp(regex);
        }
        compiled[key] = conditions;
      } else {
        compiled[key] = condition;
      }
    }
    return compiled as QueryFilter<T>;
  }
}

/**
 * Internal Dexie subclass that manages dynamic collection creation.
 * Collections are added lazily via schema version upgrades.
 */
class ZerithDBDexie extends Dexie {
  private readonly tableMap = new Map<string, Table>();
  private _currentSchema: Record<string, string> = {};
  private _pendingVersion = 0;

  constructor(appId: string) {
    super(`zerithdb_${appId}`);
  }



  /**
   * Ensure a named collection exists, creating it via a Dexie version
   * upgrade if it has not been registered yet.
   *
   * @param name - The collection name to create or retrieve
   * @returns The Dexie {@link Table} handle for the collection
   */
  ensureCollection(name: string): Table {
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ZerithDBError(ErrorCode.DB_INIT_FAILED, "Collection name cannot be empty");
    }

    if (!this.tableMap.has(name)) {
      this._currentSchema[name] = "_id, _createdAt, _updatedAt";

      // We must increment the version for every new collection added dynamically
      const nextVersion = Math.max(this.verno, this._pendingVersion) + 1;

      this._pendingVersion = nextVersion;

      if (this.isOpen()) {
        this.close();
      }

      this.version(nextVersion).stores(this._currentSchema);

      this.tableMap.set(name, this.table(name));
    }

    return this.tableMap.get(name)!;
  }

  ensureGraphTables(graphName: string): { nodesTable: Table; edgesTable: Table } {
  const nodesKey = `__graph_nodes_${graphName}`;
  const edgesKey = `__graph_edges_${graphName}`;

  if (!this.tableMap.has(nodesKey) || !this.tableMap.has(edgesKey)) {
    this._currentSchema[nodesKey] = "_id, _createdAt, _updatedAt";
    this._currentSchema[edgesKey] = "_id, from, to, label, _createdAt";

    const nextVersion = Math.max(this.verno, this._pendingVersion) + 1;
    this._pendingVersion = nextVersion;

    if (this.isOpen()) {
      this.close();
    }

    this.version(nextVersion).stores(this._currentSchema);
    this.tableMap.set(nodesKey, this.table(nodesKey));
    this.tableMap.set(edgesKey, this.table(edgesKey));
  }

  return {
    nodesTable: this.tableMap.get(nodesKey)!,
    edgesTable: this.tableMap.get(edgesKey)!,
  };
}
}

/**
 * Internal database client. Wraps Dexie and manages collection instances.
 * Use via {@link ZerithDBApp.db} — not instantiated directly.
 */
export class DbClient {
  private readonly dexie: ZerithDBDexie;
  private readonly appId: string;

  private readonly collections = new Map<string, CollectionClient<any>>();

  private readonly graphs = new Map<string, GraphClient<any>>();

  constructor(config: ZerithDBConfig) {
    if (!config?.appId || typeof config.appId !== "string") {
      throw new ZerithDBError(ErrorCode.DB_INIT_FAILED, "Invalid appId provided");
    }

    this.appId = config.appId;
    this.dexie = new ZerithDBDexie(config.appId);
  }

  collection<T extends Record<string, any>>(name: string): CollectionClient<T> {
    if (typeof name !== "string" || name.trim() === "") {
      throw new ZerithDBError(
        ErrorCode.DB_INIT_FAILED,
        "Collection name must be a non-empty string"
      );
    }

    if (!this.collections.has(name)) {
      const table = this.dexie.ensureCollection(name);

      this.collections.set(name, new CollectionClient<T>(table as Table<Document<T>>, name));
    }

    return this.collections.get(name) as CollectionClient<T>;
  }

  graph<T extends Record<string, any> = Record<string, any>>(name: string): GraphClient<T> {
  if (!this.graphs.has(name)) {
    const { nodesTable, edgesTable } = this.dexie.ensureGraphTables(name);
    this.graphs.set(
      name,
      new GraphClient<T>(
        nodesTable as Table<GraphNode<T>>,
        edgesTable as Table<GraphEdge>,
        name
      )
    );
  }
  return this.graphs.get(name) as GraphClient<T>;
}

  async getMemoryStats(): Promise<{ recordCount: number; collections: Record<string, number> }> {
    const collections: Record<string, number> = {};
    let recordCount = 0;

    for (const [name, client] of this.collections) {
      const count = await client.count();

      collections[name] = count;
      recordCount += count;
    }

    return { recordCount, collections };
  }

  /**
   * Returns names of collections that have been opened in this session.
   */
  collectionNames(): string[] {
    return Array.from(this.collections.keys());
  }

  /**
   * Returns names of all collections currently stored in IndexedDB.
   */
  allCollectionNames(): string[] {
    return this.dexie.tables.map((t) => t.name);
  }

  /**
   * Export all collections to a JSON-serializable snapshot.
   * If options.collections is omitted, it exports ALL collections found in IndexedDB.
   */
  async exportSnapshot(options: BackupExportOptions = {}): Promise<BackupSnapshot> {
    return wrapIDBOperation(
      ErrorCode.DB_READ_FAILED,
      "Failed to export local backup snapshot",
      async () => {
        const collectionNames = options.collections ?? this.allCollectionNames();

        const collections: BackupSnapshot["collections"] = {};

        for (const name of collectionNames) {
          const table = this.dexie.ensureCollection(name);

          collections[name] = (await table.toArray()) as Document<Record<string, any>>[];
        }

        return {
          format: "zerithdb.local-backup.v1",
          appId: this.appId,
          generatedAt: new Date().toISOString(),
          collections,
        };
      }
    );
  }

  async dispose(): Promise<void> {
    this.dexie.close();
  }
}
