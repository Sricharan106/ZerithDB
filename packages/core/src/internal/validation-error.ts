/**
 * Custom error class for ZerithDB schema validation failures.
 * Wraps a ZodError (or any validation error) into a clean, readable format
 * that is safe to surface to application code without crashing the sync engine.
 *
 * @example
 * ```typescript
 * try {
 *   await users.insert({ name: 42 }); // fails schema
 * } catch (err) {
 *   if (err instanceof ZerithValidationError) {
 *     console.error(err.issues); // structured field-level issues
 *   }
 * }
 * ```
 */
export class ZerithValidationError extends Error {
  /** Structured list of field-level validation issues */
  public readonly issues: ReadonlyArray<{ path: string; message: string }>;

  constructor(
    message: string,
    issues: ReadonlyArray<{ path: string; message: string }>,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ZerithValidationError";
    this.issues = issues;

    // Maintains proper prototype chain in older envs
    Object.setPrototypeOf(this, new.target.prototype);
  }

  override toString(): string {
    const issueLines = this.issues.map((i) => `  • ${i.path || "(root)"}: ${i.message}`).join("\n");
    return `${this.name}: ${this.message}\n${issueLines}`;
  }

  /**
   * Build a ZerithValidationError from a ZodError-shaped object.
   * Accepts any object with a `.errors` array matching Zod's `ZodIssue` shape
   * so that `zod` itself remains an optional peer dependency of zerithdb-core.
   */
  static fromZodError(
    zodError: {
      errors: ReadonlyArray<{
        path: ReadonlyArray<string | number>;
        message: string;
      }>;
    },
    context: string
  ): ZerithValidationError {
    const issues = zodError.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));

    const summary = issues.map((i) => `${i.path || "(root)"}: ${i.message}`).join("; ");

    return new ZerithValidationError(
      `Schema validation failed for ${context}: ${summary}`,
      issues,
      { cause: zodError }
    );
  }
}
