/**
 * Unit tests for opt-in schema validation via CollectionClient.withSchema()
 *
 * These tests use a minimal hand-rolled schema to avoid requiring `zod`
 * as an install-time dependency in the test environment.
 * Tests cover: valid/invalid insert, valid/invalid update, and no-schema behavior.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { DbClient } from "../../packages/db/src/db-client.js";
import { ZerithValidationError } from "../../packages/core/src/index.js";
import type { ZerithDBConfig } from "../../packages/core/src/index.js";

// ---------------------------------------------------------------------------
// Minimal mock schema — mimics the Zod `parse()` interface
// ---------------------------------------------------------------------------

interface MockIssue {
  path: string[];
  message: string;
}

function createMockSchema<T>(
  validator: (
    data: unknown,
    isPartial: boolean
  ) => { ok: true; value: T } | { ok: false; errors: MockIssue[] },
  isPartial = false
) {
  return {
    parse(data: unknown): T {
      const result = validator(data, isPartial);
      if (result.ok) return result.value;
      // Throw a Zod-shaped error so CollectionClient can detect it
      const err = new Error("Validation failed") as Error & { errors: MockIssue[] };
      err.errors = result.errors;
      throw err;
    },
    partial() {
      return createMockSchema(validator, true);
    },
  };
}

// A schema that requires { name: string; age: number }
type UserDoc = { name: string; age: number };
const userSchema = createMockSchema<UserDoc>((data, isPartial) => {
  const d = data as Record<string, unknown>;
  const errors: MockIssue[] = [];

  if (!isPartial || "name" in d) {
    if (typeof d["name"] !== "string") errors.push({ path: ["name"], message: "Expected string" });
  }
  if (!isPartial || "age" in d) {
    if (typeof d["age"] !== "number") errors.push({ path: ["age"], message: "Expected number" });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: d as UserDoc };
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("CollectionClient — withSchema() validation", () => {
  let db: DbClient;

  beforeEach(() => {
    const uniqueAppId = "test-schema-" + Math.random().toString(36).slice(2);
    db = new DbClient({ appId: uniqueAppId });
  });

  afterEach(async () => {
    await db.dispose();
  });

  // ── insert ────────────────────────────────────────────────────────────────

  describe("insert()", () => {
    it("should succeed when inserting a valid document", async () => {
      const users = db.collection<UserDoc>("users").withSchema(userSchema);
      const result = await users.insert({ name: "Alice", age: 30 });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
    });

    it("should throw ZerithValidationError when inserting an invalid document", async () => {
      const users = db.collection<UserDoc>("users").withSchema(userSchema);

      try {
        await users.insert({ name: 42, age: "not-a-number" } as unknown as UserDoc);
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.name).toBe("ZerithValidationError");
      }
    });

    it("should include meaningful field-level issue messages on invalid insert", async () => {
      const users = db.collection<UserDoc>("users").withSchema(userSchema);

      let caught: any = null;
      try {
        await users.insert({ name: 99, age: "oops" } as unknown as UserDoc);
      } catch (err) {
        caught = err;
      }

      expect(caught).not.toBeNull();
      expect(caught.name).toBe("ZerithValidationError");
      expect(caught.issues.some((i: any) => i.path === "name")).toBe(true);
      expect(caught.issues.some((i: any) => i.path === "age")).toBe(true);
    });
  });

  // ── insertMany ────────────────────────────────────────────────────────────

  describe("insertMany()", () => {
    it("should succeed when all documents are valid", async () => {
      const users = db.collection<UserDoc>("users").withSchema(userSchema);
      const results = await users.insertMany([
        { name: "Bob", age: 25 },
        { name: "Carol", age: 35 },
      ]);
      expect(results).toHaveLength(2);
    });

    it("should throw ZerithValidationError if any document in the batch is invalid", async () => {
      const users = db.collection<UserDoc>("users").withSchema(userSchema);

      try {
        await users.insertMany([
          { name: "Dave", age: 40 },
          { name: 0, age: "bad" } as unknown as UserDoc,
        ]);
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.name).toBe("ZerithValidationError");
      }
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe("update()", () => {
    it("should succeed when updating with valid partial data", async () => {
      const users = db.collection<UserDoc>("users").withSchema(userSchema);
      await users.insert({ name: "Eve", age: 28 });

      const count = await users.update({ name: "Eve" }, { $set: { age: 29 } });
      expect(count).toBe(1);
    });

    it("should throw ZerithValidationError when updating with invalid data", async () => {
      const users = db.collection<UserDoc>("users").withSchema(userSchema);
      await users.insert({ name: "Frank", age: 22 });

      try {
        await users.update(
          { name: "Frank" },
          { $set: { age: "not-a-number" } as unknown as Partial<UserDoc> }
        );
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.name).toBe("ZerithValidationError");
      }
    });
  });

  // ── no schema ─────────────────────────────────────────────────────────────

  describe("collections without a schema", () => {
    it("should insert any shape without validation errors", async () => {
      // No .withSchema() call — plain collection
      const items = db.collection<{ x: number }>("untyped");
      const result = await items.insert({ x: 1 });
      expect(result.id).toBeDefined();
    });

    it("should update without validation errors when no schema is attached", async () => {
      const items = db.collection<{ v: number }>("vals");
      const { id } = await items.insert({ v: 10 });
      const count = await items.update({ _id: id } as never, { $set: { v: 20 } });
      expect(count).toBe(1);
    });
  });

  // ── ZerithValidationError surface area ────────────────────────────────────

  describe("ZerithValidationError", () => {
    it("should have a meaningful toString()", async () => {
      const users = db.collection<UserDoc>("users").withSchema(userSchema);

      let err: any = null;
      try {
        await users.insert({ name: 0 as unknown as string, age: "x" as unknown as number });
      } catch (e) {
        err = e;
      }

      expect(err).not.toBeNull();
      expect(err.name).toBe("ZerithValidationError");
      const str = err.toString();
      expect(str).toContain("ZerithValidationError");
      expect(str).toContain("name");
    });
  });
});
