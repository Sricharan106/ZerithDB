import { Dexie, type Table, liveQuery } from "dexie";
import { v7 as uuidv7 } from "uuid";
import type {
  ZerithDBConfig,
  Document,
  QueryFilter,
  QueryOptions,
  InsertResult,
  UpdateSpec,
} from "zerithdb-core";
import { ZerithDBError, ErrorCode } from "zerithdb-core";
import { wrapIDBOperation } from "./internal/wrap-idb-operation.js";
import { EventEmitter } from "zerithdb-core";
import type { BackupExportOptions, BackupSnapshot } from "./backup.js";

const RESERVED_FIELDS = ["_id", "_createdAt", "_updatedAt"];

import { GraphClient } from "./graph-client.js";
import type { GraphNode, GraphEdge } from "zerithdb-core";

// [UCAN] Imports for capability verification
import type { AuthManager } from "zerithdb-auth";
import type { UCAN, Capability } from "zerithdb-auth";
import { allowsAction } from "zerithdb-auth";

/**
 * A handle to a single named collection within the ZerithDB local database.
 * All operations are async and backed by IndexedDB.
 */

export class CollectionClient<T extends Record<string, any> = Record<string, any>> {
  constructor(
    private readonly table: Table<Document<T>>,
    private readonly collectionName: string,
    private readonly notifyMutation?: () => void
  ) {}

  private async checkBiometric(operationDescription: string): Promise<void> {
    if (this.auth?.biometric?.isBiometricRequiredForDB()) {
      const authorized = await this.auth.biometric.promptBiometric(
        `Authorize sensitive database operation: ${operationDescription} in collection "${this.collectionName}"`
      );
      if (!authorized) {
        throw new ZerithDBError(
          ErrorCode.AUTH_SIGN_FAILED,
          "Database operation cancelled or biometric authentication failed."
        );
      }
    }
  }

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
      error: (err) =>
        console.error(
          `[ZerithDB] Error in subscription to collection "${this.collectionName}":`,
          err
        ),
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
    let docToInsert = { ...document };
    if (this.config?.ipfs?.enabled) {
      const sizeThreshold = this.config.ipfs.sizeThreshold ?? 0;
      const provider =
        this.config.ipfs.provider ??
        new DefaultIpfsProvider(this.config.ipfs.apiUrl, this.config.ipfs.gatewayUrl);
      const uploadFn = (data: Blob | Uint8Array) => provider.upload(data);
      docToInsert = await uploadLargeFiles(docToInsert, sizeThreshold, uploadFn);
    }

    const now = Date.now();
    const id = uuidv7();

    const doc: Document<T> = {
      ...docToInsert,
      _id: id,
      _createdAt: now,
      _updatedAt: now,
    };

    return wrapIDBOperation(
      ErrorCode.DB_WRITE_FAILED,
      `Failed to insert into collection "${this.collectionName}"`,
      async () => {
        await this.table.add(doc);
        this.notifyMutation?.();
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

    await this.checkBiometric("Bulk Insert Documents");
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
        this.notifyMutation?.();
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
  async find(filter: QueryFilter<T> = {}, options: QueryOptions<T> = {}): Promise<Document<T>[]> {
        this.validateFilter(filter);

    return wrapIDBOperation(
      ErrorCode.DB_READ_FAILED,
      `Failed to query collection "${this.collectionName}"`,
      async () => {
        const compiledFilter = this.precompileRegexes(filter);
        const results: Document<T>[] = [];

        await this.table.each((doc) => {
          if (this.matchesFilter(doc, compiledFilter)) {
            results.push(doc);
          }
        });

        if (options.sort) {
          const { field, order = "asc" } = options.sort;

          results.sort((a, b) => {
            const aValue = a[field];
            const bValue = b[field];

            if (aValue === bValue) return 0;

            if (aValue == null) return 1;
            if (bValue == null) return -1;

            const comparison = String(aValue).localeCompare(String(bValue), undefined, {
              numeric: true,
              sensitivity: "base",
            });

            return order === "desc" ? -comparison : comparison;
          });
        }

        const skip = options.skip ?? options.offset ?? 0;
        const limit = options.limit ?? Number.POSITIVE_INFINITY;

        return results.slice(skip, skip + limit);
      }
    );

    if (restoreIpfs && this.config?.ipfs?.enabled) {
      const restoredResults: Document<T>[] = [];
      for (const doc of results) {
        restoredResults.push(await this.restoreIpfsReferences(doc));
      }
      return restoredResults;
    }

    return results;
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
    if (!doc) return undefined;
    return this.restoreIpfsReferences(doc);
  }

  /**
   * Update documents matching a filter.
   * Returns the number of updated documents.
   */

  async update(filter: QueryFilter<T>, spec: UpdateSpec<T>): Promise<number> {
    this.validateFilter(filter);

    if (spec === null || spec === undefined || typeof spec !== "object") {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "Update spec must be a valid object");
    }

    const hasSet = spec.$set && Object.keys(spec.$set).length > 0;

    const hasUnset = spec.$unset && Object.keys(spec.$unset).length > 0;

    if (!hasSet && !hasUnset) {
      throw new ZerithDBError(
        ErrorCode.DB_WRITE_FAILED,
        "Update spec must contain non-empty $set or $unset"
      );
    }
    await this.checkBiometric("Update Documents");
    return wrapIDBOperation(
      ErrorCode.DB_WRITE_FAILED,
      `Failed to update documents in "${this.collectionName}"`,
      async () => {
        const matches = await this.find(filter);

        if (matches.length === 0) {
          return 0;
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

    await this.checkBiometric("Delete Documents");
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
    await this.checkPermission("delete");

    return wrapIDBOperation(
      ErrorCode.DB_DELETE_FAILED,
      `Failed to clear collection "${this.collectionName}"`,
      async () => {
        await this.table.clear();
        this.notifyMutation?.();
      }
    );
  }

  async clear(): Promise<void> {
    return this.clearAll();
  }

  async count(filter: QueryFilter<T> = {}): Promise<number> {
    await this.checkPermission("read");

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

 private async checkPermission(action: "read" | "write" | "create" | "delete"): Promise<void> {
  const auth = this.getAuth();
  if (!auth) return; // no auth → skip checks (legacy mode)

  const capabilityUcan = this.getCapability();
  if (!capabilityUcan) {
    throw new ZerithDBError(
      ErrorCode.PERMISSION_DENIED,
      `No capability set for collection "${this.collectionName}". Call db.setCapability() first.`
    );
  }

  const isValid = await auth.verifyUCAN(capabilityUcan);
  if (!isValid) {
    throw new ZerithDBError(
      ErrorCode.PERMISSION_DENIED,
      `Capability for collection "${this.collectionName}" is invalid or expired.`
    );
  }

  const capabilities = auth.getCapabilities(capabilityUcan);
  const resource = `zerithdb://${this.appId}/${this.collectionName}`;
  const allowed = capabilities.some((cap: Capability) => allowsAction(cap, resource, action));
  if (!allowed) {
    throw new ZerithDBError(
      ErrorCode.PERMISSION_DENIED,
      `Action "${action}" on collection "${this.collectionName}" not granted by current capability.`
    );
  }
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
    const validOperators = [
      "$eq",
      "$ne",
      "$gt",
      "$gte",
      "$lt",
      "$lte",
      "$in",
      "$nin",
      "$regex",
      "$exists",
    ];

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
      }
      if ("$exists" in conditions) {
        const exists = key in doc;
        if (conditions.$exists !== exists) return false;
      }
      if ("$regex" in conditions) {
        if (typeof fieldValue !== "string") return false;
        const regex =
          conditions.$regex instanceof RegExp ? conditions.$regex : new RegExp(conditions.$regex);

        regex.lastIndex = 0;
        if (!regex.test(fieldValue)) return false;
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

  private compileRegexCondition(conditions: Record<string, any>): RegExp | null {
    const rawRegex = conditions.$regex;
    const rawFlags =
      typeof conditions.$flags === "string"
        ? conditions.$flags
        : typeof conditions.$options === "string"
          ? conditions.$options
          : undefined;

    try {
      if (rawRegex instanceof RegExp) {
        if (!rawFlags) {
          return rawRegex;
        }

        const mergedFlags = Array.from(new Set((rawRegex.flags + rawFlags).split(""))).join("");
        return new RegExp(rawRegex.source, mergedFlags);
      }

      if (typeof rawRegex === "string") {
        return new RegExp(rawRegex, rawFlags);
      }

      return null;
    } catch {
      return null;
    }
  }
}

// Dexie subclass (unchanged)
class ZerithDBDexie extends Dexie {
  private readonly tableMap = new Map<string, Table>();
  private _currentSchema: Record<string, string> = {};
  private _pendingVersion = 0;
  readonly activeFetches = new Map<string, Promise<Blob>>();

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
export class DbClient extends EventEmitter<{ "mutation": { collection: string } }> {
  private readonly dexie: ZerithDBDexie;
  private readonly appId: string;

  private readonly collections = new Map<string, CollectionClient<any>>();

  private readonly graphs = new Map<string, GraphClient<any>>();

  constructor(
    config: ZerithDBConfig,
    private readonly auth?: any
  ) {
    if (!config?.appId || typeof config.appId !== "string") {
      throw new ZerithDBError(ErrorCode.DB_INIT_FAILED, "Invalid appId provided");
    }
      
    this.appId = config.appId;
    this.dexie = new ZerithDBDexie(config.appId);
    if (config.ipfs?.enabled) {
      this.dexie.ensureIpfsCacheTable();
    }
  }

  setAuth(auth: AuthManager): void {
    this.authManager = auth;
  }

  setCapability(ucan: UCAN): void {
    this.currentCapability = ucan;
  }

  clearCapability(): void {
    this.currentCapability = undefined;
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
      this.collections.set(name, new CollectionClient<T>(
        table as Table<Document<T>>, 
        name,
        () => {
          this.emit("mutation", { collection: name });
        }
      ));
    }

    return this.collections.get(name) as CollectionClient<T>;
  }

  graph<T extends Record<string, any> = Record<string, any>>(name: string): GraphClient<T> {
    if (!this.graphs.has(name)) {
      const { nodesTable, edgesTable } = this.dexie.ensureGraphTables(name);
      this.graphs.set(
        name,
        new GraphClient<T>(nodesTable as Table<GraphNode<T>>, edgesTable as Table<GraphEdge>, name)
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

  collectionNames(): string[] {
    return Array.from(this.collections.keys());
  }

  allCollectionNames(): string[] {
    return this.dexie.tables.map((t) => t.name);
  }

  async exportSnapshot(options: BackupExportOptions = {}): Promise<BackupSnapshot> {
    if (this.auth?.biometric?.isBiometricRequiredForDB()) {
      const authorized = await this.auth.biometric.promptBiometric(
        "Authorize sensitive operation: Export full database backup snapshot"
      );
      if (!authorized) {
        throw new ZerithDBError(
          ErrorCode.AUTH_SIGN_FAILED,
          "Database export cancelled or biometric authentication failed."
        );
      }
    }

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
    // Remove all EventEmitter listeners before closing to prevent memory leaks
    // from dangling references to this DbClient instance after disposal.
    this.removeAllListeners();
    this.dexie.close();
  }
}