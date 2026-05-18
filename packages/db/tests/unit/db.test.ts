import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { DbClient } from "../../src/db-client.js";
import { ErrorCode, type ZerithDBConfig } from "../../src/../../core/src/index.js";

describe("DbClient — CollectionClient", () => {
  let db: DbClient;

  beforeEach(() => {
    const testConfig: ZerithDBConfig = {
      appId: "test-db-" + Math.random().toString(36).slice(2),
    };
    db = new DbClient(testConfig);
  });

  afterEach(async () => {
    await db.dispose();
  });

  describe("insert()", () => {
    it("should return a generated _id", async () => {
      const col = db.collection<{ text: string }>("todos");
      const result = await col.insert({ text: "hello" });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);
    });

    it("should persist the document so find() returns it", async () => {
      const col = db.collection<{ text: string }>("todos");
      const { id } = await col.insert({ text: "world" });
      const docs = await col.find({});
      expect(docs).toHaveLength(1);
      expect(docs[0]?._id).toBe(id);
      expect(docs[0]?.text).toBe("world");
    });

    it("should add _createdAt and _updatedAt timestamps", async () => {
      const before = Date.now();
      const col = db.collection<{ x: number }>("items");
      await col.insert({ x: 42 });
      const after = Date.now();
      const [doc] = await col.find({});
      expect(doc?._createdAt).toBeGreaterThanOrEqual(before);
      expect(doc?._createdAt).toBeLessThanOrEqual(after);
      expect(doc?._updatedAt).toBeDefined();
    });
  });

  describe("insertMany()", () => {
    it("should insert multiple documents", async () => {
      const col = db.collection<{ n: number }>("nums");
      const results = await col.insertMany([{ n: 1 }, { n: 2 }, { n: 3 }]);
      expect(results).toHaveLength(3);
      const docs = await col.find({});
      expect(docs).toHaveLength(3);
    });
  });

  describe("find()", () => {
    it("should return all documents with empty filter", async () => {
      const col = db.collection<{ v: number }>("vals");
      await col.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);
      const docs = await col.find({});
      expect(docs).toHaveLength(3);
    });

    it("should filter by exact equality", async () => {
      const col = db.collection<{ done: boolean }>("tasks");
      await col.insertMany([{ done: true }, { done: false }, { done: true }]);
      const done = await col.find({ done: true });
      expect(done).toHaveLength(2);
    });

    it("should support $gt operator", async () => {
      const col = db.collection<{ score: number }>("scores");
      await col.insertMany([{ score: 10 }, { score: 50 }, { score: 90 }]);
      const high = await col.find({ score: { $gt: 30 } });
      expect(high).toHaveLength(2);
    });

    it("should support $in operator", async () => {
      const col = db.collection<{ status: string }>("items");
      await col.insertMany([{ status: "open" }, { status: "closed" }, { status: "pending" }]);
      const active = await col.find({ status: { $in: ["open", "pending"] } });
      expect(active).toHaveLength(2);
    });

    it("should return empty array when no documents match", async () => {
      const col = db.collection<{ x: number }>("empty");
      await col.insert({ x: 1 });
      const result = await col.find({ x: { $gt: 100 } });
      expect(result).toHaveLength(0);
    });
  });

  describe("findById()", () => {
    it("should return the document with matching _id", async () => {
      const col = db.collection<{ name: string }>("people");
      const { id } = await col.insert({ name: "Alice" });
      const doc = await col.findById(id);
      expect(doc?.name).toBe("Alice");
    });

    it("should return undefined for unknown _id", async () => {
      const col = db.collection<{ name: string }>("people");
      const doc = await col.findById("nonexistent-id");
      expect(doc).toBeUndefined();
    });
  });

  describe("update()", () => {
    it("should update matching documents", async () => {
      const col = db.collection<{ done: boolean; text: string }>("todos");
      await col.insert({ text: "fix bug", done: false });
      const count = await col.update({ done: false }, { $set: { done: true } });
      expect(count).toBe(1);
      const docs = await col.find({ done: true });
      expect(docs).toHaveLength(1);
    });

    it("should update _updatedAt on update", async () => {
      const col = db.collection<{ v: number }>("vals");
      const { id } = await col.insert({ v: 1 });
      const before = (await col.findById(id))?._updatedAt ?? 0;
      await new Promise((r) => setTimeout(r, 5));
      await col.update({ _id: id } as never, { $set: { v: 2 } });
      const after = (await col.findById(id))?._updatedAt ?? 0;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  describe("delete()", () => {
    it("should remove matching documents", async () => {
      const col = db.collection<{ done: boolean }>("tasks");
      await col.insertMany([{ done: true }, { done: false }]);
      const count = await col.delete({ done: true });
      expect(count).toBe(1);
      const remaining = await col.find({});
      expect(remaining).toHaveLength(1);
    });
  });

  describe("clearAll()", () => {
    it("should remove every document in the collection", async () => {
      const col = db.collection<{ done: boolean }>("tasks");
      await col.insertMany([{ done: true }, { done: false }, { done: true }]);

      await col.clearAll();

      expect(await col.find({})).toHaveLength(0);
      expect(await col.count()).toBe(0);
    });

    it("should not clear other collections", async () => {
      const tasks = db.collection<{ done: boolean }>("tasks");
      const notes = db.collection<{ text: string }>("notes");
      await tasks.insertMany([{ done: true }, { done: false }]);
      await notes.insert({ text: "keep me" });

      await tasks.clearAll();

      expect(await tasks.count()).toBe(0);
      expect(await notes.count()).toBe(1);
    });
  });

  describe("count()", () => {
    it("should return correct document count", async () => {
      const col = db.collection<{ x: number }>("counts");
      await col.insertMany([{ x: 1 }, { x: 2 }, { x: 3 }]);
      expect(await col.count()).toBe(3);
      expect(await col.count({ x: { $gt: 1 } })).toBe(2);
    });
  });

  describe("createIndex()", () => {
    it("should require a comparator for non-primitive field values", async () => {
      const col = db.collection<{ meta: { rank: number } }>("meta");
      await col.insert({ meta: { rank: 1 } });

      await expect(
        col.createIndex({ name: "meta_idx", field: "meta" })
      ).rejects.toMatchObject({ code: ErrorCode.SDK_INVALID_CONFIG });
    });

    it("should allow missing optional field values", async () => {
      const col = db.collection<{ rank?: number | null }>("optional-rank");
      await col.insertMany([{ rank: 2 }, {}, { rank: null }]);

      await expect(
        col.createIndex({ name: "rank_idx", field: "rank" })
      ).resolves.toBeUndefined();
    });

    it("should wrap comparator errors as DB_READ_FAILED", async () => {
      const col = db.collection<{ score: number }>("score");
      await col.insertMany([{ score: 1 }, { score: 2 }]);

      await expect(
        col.createIndex({
          name: "score_idx",
          field: "score",
          compare: () => {
            throw new Error("boom");
          },
        })
      ).rejects.toMatchObject({ code: ErrorCode.DB_READ_FAILED });
    });

    it("should use custom comparator for range queries and ordering", async () => {
      const col = db.collection<{ name: string }>("people");
      await col.insertMany([
        { name: "z" },
        { name: "aa" },
        { name: "bbb" },
        { name: "cccc" },
      ]);

      await col.createIndex({
        name: "name_length",
        field: "name",
        compare: (a, b) => (a as string).length - (b as string).length,
      });

      const results = await col.find({ name: { $gt: "m" } });
      expect(results.map((r) => r.name)).toEqual(["aa", "bbb", "cccc"]);
    });
  });
});
