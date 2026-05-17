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

export class CollectionClient<T extends Record<string, any> = Record<string, any>> {
  constructor(
    private readonly table: Table<Document<T>>,
    private readonly collectionName: string
  ) {}

  subscribe(callback: (documents: Document<T>[]) => void): () => void {
    const observable = liveQuery(() => this.find());

    const subscription = observable.subscribe({
      next: (docs) => callback(docs),
      error: (err) => console.error(`Error in collection subscription:`, err),
    });

    return () => subscription.unsubscribe();
  }

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

  async clearAll(): Promise<void> {
    return wrapIDBOperation(
      ErrorCode.DB_DELETE_FAILED,
      `Failed to clear collection "${this.collectionName}"`,
      () => this.table.clear()
    );
  }

  async clear(): Promise<void> {
    return this.clearAll();
  }

  async count(filter: QueryFilter<T> = {}): Promise<number> {
    const docs = await this.find(filter);
    return docs.length;
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
    const validOperators = ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"];

    for (const [key, condition] of Object.entries(filter)) {
      const fieldValue = (doc as Record<string, any>)[key];

      if (condition === null || typeof condition !== "object") {
        if (fieldValue !== condition) return false;
        continue;
      }

      const conditions = condition as Record<string, any>;

      for (const op of Object.keys(conditions)) {
        if (op.startsWith("$") && !validOperators.includes(op)) {
          throw new ZerithDBError(ErrorCode.DB_READ_FAILED, `Unsupported query operator: ${op}`);
        }
      }

      const isOperatorObject = Object.keys(conditions).some((k) => k.startsWith("$"));

      if (!isOperatorObject) {
        if (JSON.stringify(fieldValue) !== JSON.stringify(condition)) {
          return false;
        }

        continue;
      }

      if ("$eq" in conditions && fieldValue !== conditions.$eq) return false;
      if ("$ne" in conditions && fieldValue === conditions.$ne) return false;
      if ("$gt" in conditions && !(fieldValue > conditions.$gt)) return false;
      if ("$gte" in conditions && !(fieldValue >= conditions.$gte)) return false;
      if ("$lt" in conditions && !(fieldValue < conditions.$lt)) return false;
      if ("$lte" in conditions && !(fieldValue <= conditions.$lte)) return false;

      if ("$in" in conditions && !(conditions.$in as unknown[]).includes(fieldValue)) {
        return false;
      }

      if ("$nin" in conditions && (conditions.$nin as unknown[]).includes(fieldValue)) {
        return false;
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
          conditions["$regex"] = regex instanceof RegExp ? regex : new RegExp(regex);
        }
        compiled[key] = conditions;
      } else {
        compiled[key] = condition;
      }
    }
    return compiled as QueryFilter<T>;
  }
}

class ZerithDBDexie extends Dexie {
  private readonly tableMap = new Map<string, Table>();
  private _currentSchema: Record<string, string> = {};
  private _pendingVersion = 0;

  constructor(appId: string) {
    super(`zerithdb_${appId}`);
  }

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
}

export class DbClient {
  private readonly dexie: ZerithDBDexie;
  private readonly appId: string;

  private readonly collections = new Map<string, CollectionClient<any>>();

  private readonly undoHistory: BackupSnapshot[] = [];
  private readonly redoHistory: BackupSnapshot[] = [];

  private readonly MAX_HISTORY = 20;

  constructor(config: ZerithDBConfig) {
    if (!config?.appId || typeof config.appId !== "string") {
      throw new ZerithDBError(ErrorCode.DB_INIT_FAILED, "Invalid appId provided");
    }

    this.appId = config.appId;
    this.dexie = new ZerithDBDexie(config.appId);
  }

  collection<T extends Record<string, any>>(name: string): CollectionClient<T> {
    if (!name || typeof name !== "string" || !name.trim()) {
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

  async getMemoryStats(): Promise<{
    recordCount: number;
    collections: Record<string, number>;
  }> {
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

  async saveUndoSnapshot(): Promise<void> {
    const snapshot = await this.exportSnapshot();

    this.undoHistory.push(snapshot);

    if (this.undoHistory.length > this.MAX_HISTORY) {
      this.undoHistory.shift();
    }

    // new mutation invalidates redo chain
    this.redoHistory.length = 0;
  }

  private async restoreSnapshot(snapshot: BackupSnapshot): Promise<void> {
    for (const name of this.allCollectionNames()) {
      const table = this.dexie.ensureCollection(name);
      await table.clear();
    }

    for (const [collectionName, docs] of Object.entries(snapshot.collections)) {
      const table = this.dexie.ensureCollection(collectionName);

      if (docs.length > 0) {
        await table.bulkPut(docs);
      }
    }
  }

  async undo(): Promise<void> {
    const snapshot = this.undoHistory.pop();

    if (!snapshot) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "No operation to undo");
    }

    // save CURRENT state for redo
    const currentSnapshot = await this.exportSnapshot();

    this.redoHistory.push(currentSnapshot);

    await this.restoreSnapshot(snapshot);
  }

  async redo(): Promise<void> {
    const snapshot = this.redoHistory.pop();

    if (!snapshot) {
      throw new ZerithDBError(ErrorCode.DB_WRITE_FAILED, "No operation to redo");
    }

    // save current state for undo
    const currentSnapshot = await this.exportSnapshot();

    this.undoHistory.push(currentSnapshot);

    await this.restoreSnapshot(snapshot);
  }
}
