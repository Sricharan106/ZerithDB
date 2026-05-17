/** Unique identifier for a document — UUID v7 string */
export type DocumentId = string;

/** Name of a collection within ZerithDB */
export type CollectionName = string;

/** Metadata fields added to every document by ZerithDB */
type Metadata = {
  _id: DocumentId;
  /** Created-at timestamp in Unix milliseconds */
  _createdAt: number;
  /** Last-updated-at timestamp in Unix milliseconds */
  _updatedAt: number;
};

/** Internal helper to safely merge schema and metadata fields */
type MergeDocument<T extends Record<string, any>> = {
  [K in keyof T | keyof Metadata]: K extends keyof Metadata
    ? Metadata[K]
    : K extends keyof T
      ? T[K]
      : never;
};

/** Base document shape. All stored documents have metadata fields added automatically. */
export type Document<T extends Record<string, any> = Record<string, any>> = MergeDocument<T>;

/**
 * MongoDB-style query filter operators.
 * Supports filtering on both schema fields and metadata (_id, _createdAt, _updatedAt).
 */
export type QueryFilter<T extends Record<string, any>> = {
  [K in keyof Document<T>]?:
    | Document<T>[K]
    | { $eq: Document<T>[K] }
    | { $ne: Document<T>[K] }
    | { $gt: Document<T>[K] }
    | { $gte: Document<T>[K] }
    | { $lt: Document<T>[K] }
    | { $lte: Document<T>[K] }
    | { $in: Document<T>[K][] }
    | { $nin: Document<T>[K][] };
};

/** Partial update spec — only specified fields are modified */
export type UpdateSpec<T extends Record<string, any>> = {
  $set?: Partial<T>;
  $unset?: { [K in keyof T]?: true };
};

export type InsertResult = {
  id: DocumentId;
};

export type FindResult<T extends Record<string, any>> = {
  documents: Document<T>[];
  count: number;
};
