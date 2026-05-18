import type { SchemaLike, ValidationMode } from "../types/validation.js";

export interface RegisteredValidator<T = unknown> {
  readonly schema: SchemaLike<T>;
  readonly mode: ValidationMode;
  readonly collectionName: string;
}

/**
 * Centralized validator registry — single source of truth for all collection schemas.
 * Created once per ZerithDB app instance and shared by DbClient + SyncEngine.
 *
 * Immutable per collection: once a schema is registered for a collection name,
 * attempting to register a different schema throws.
 *
 * **Schema identity uses `===` (reference equality).** Two structurally identical
 * Zod schemas created separately are considered *different* schemas. This is
 * intentional — hoist your schema to a module-level constant:
 *
 * ```typescript
 * // ✅ Do this:
 * const TodoSchema = z.object({ text: z.string() });
 * app.db("todos", { validation: { schema: TodoSchema } });
 *
 * // ❌ Not this (creates a new reference each call):
 * app.db("todos", { validation: { schema: z.object({ text: z.string() }) } });
 * ```
 */
export class ValidatorRegistry {
  private readonly validators = new Map<string, RegisteredValidator>();

  /**
   * Register a schema for a collection.
   *
   * **Idempotent:** Re-registering the same schema instance is a safe no-op
   * (important for React re-renders and HMR).
   *
   * **Throws** if a *different* schema reference is registered for the same
   * collection name. Uses `===` identity — not deep comparison.
   */
  register<T>(
    collectionName: string,
    schema: SchemaLike<T>,
    mode: ValidationMode = "strict"
  ): void {
    const existing = this.validators.get(collectionName);
    if (existing) {
      if (existing.schema !== schema) {
        throw new Error(
          `Schema conflict: collection "${collectionName}" already has a registered schema. ` +
            `Cannot register a different schema instance for the same collection. ` +
            `Ensure you are passing the same schema object reference (hoist it to a module-level constant).`
        );
      }
      return; // Same schema re-registered — no-op (safe for React/HMR)
    }
    this.validators.set(collectionName, { schema, mode, collectionName });
  }

  /**
   * Update the registered schema and validation mode for a collection.
   * Replaces any existing registration by reusing register() logic internally.
   */
  update<T>(collectionName: string, schema: SchemaLike<T>, mode: ValidationMode = "strict"): void {
    this.remove(collectionName);
    this.register(collectionName, schema, mode);
  }

  /**
   * Remove the registered schema for a collection.
   * Returns true if a registry was successfully deleted, false otherwise.
   */
  remove(collectionName: string): boolean {
    return this.validators.delete(collectionName);
  }

  /** Get the registered validator for a collection, or undefined if none. */
  get(collectionName: string): RegisteredValidator | undefined {
    return this.validators.get(collectionName);
  }

  /** Check if a collection has a registered schema. */
  has(collectionName: string): boolean {
    return this.validators.has(collectionName);
  }

  /**
   * Validate a single document against the collection's registered schema.
   * Returns { valid: true } if no schema is registered.
   * In "strict" mode, throws SchemaValidationError.
   * In "warn" mode, returns the issues without throwing.
   * In "off" mode, returns { valid: true }.
   */
  validate(collectionName: string, data: unknown): ValidationResult {
    const reg = this.validators.get(collectionName);
    if (!reg || reg.mode === "off") return { valid: true };

    const result = reg.schema.safeParse(data);
    if (result.success) return { valid: true };

    const issues = result.error.issues;
    if (reg.mode === "strict") {
      // Caller (DbClient) will catch this and wrap as SchemaValidationError
      return { valid: false, issues, shouldThrow: true };
    }

    // "warn" mode
    return { valid: false, issues, shouldThrow: false };
  }

  /**
   * Validate for remote sync context — never throws, always returns issues.
   * Remote updates must always be applied to preserve CRDT convergence.
   */
  validateRemote(collectionName: string, data: unknown): ValidationResult {
    const reg = this.validators.get(collectionName);
    if (!reg || reg.mode === "off") return { valid: true };

    const result = reg.schema.safeParse(data);
    if (result.success) return { valid: true };

    return { valid: false, issues: result.error.issues, shouldThrow: false };
  }
}

export type ValidationResult =
  | { valid: true }
  | {
      valid: false;
      issues: Array<{ path: Array<string | number | symbol>; message: string }>;
      shouldThrow: boolean;
    };
