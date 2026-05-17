/** Unique identifier for a document — UUID v7 string */
export type DocumentId = string;

/** Name of a collection within ZerithDB */
export type CollectionName = string;

/** Base document shape. All stored documents have an `_id` field added automatically. */
export type Document<T extends Record<string, any> = Record<string, any>> = T & {
  _id: DocumentId;
  /** Created-at timestamp in Unix milliseconds */
  _createdAt: number;
  /** Last-updated-at timestamp in Unix milliseconds */
  _updatedAt: number;
};

/**
 * MongoDB-style query filter operators.
 * Nested object fields are matched by equality.
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
    | { $nin: Document<T>[K][] }
    | { $exists: boolean }
    | { $regex: RegExp | string };
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
