/**
 * Generic schema interface — structurally compatible with Zod's `z.ZodType`.
 * Any object with a `safeParse(data)` method that returns `{ success, data, error }` works.
 */
export interface SchemaLike<T = unknown> {
  safeParse(data: unknown): SafeParseResult<T>;
}

export type SafeParseResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { issues: Array<{ path: Array<string | number | symbol>; message: string }> };
    };

/** Validation mode for a collection */
export type ValidationMode = "strict" | "warn" | "off";

/** Options for schema-validated collections */
export interface CollectionSchemaOptions<T = unknown> {
  /** The Zod schema (or any SchemaLike) to validate documents against */
  schema: SchemaLike<T>;
  /** How to handle validation failures. @default "strict" */
  mode?: ValidationMode;
}
