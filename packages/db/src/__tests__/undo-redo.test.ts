import "fake-indexeddb/auto";

import { describe, it, expect } from "vitest";
import { DbClient } from "zerithdb-db";

describe("undo/redo", () => {
  it("undoes an insert", async () => {
    const db = new DbClient({
      appId: "undo-insert-test",
    });

    const users = db.collection<{ name: string }>("users");

    await users.insert({
      name: "John",
    });

    expect(await users.count()).toBe(1);

    await db.undo();

    expect(await users.count()).toBe(0);
  });

  it("redoes an insert", async () => {
    const db = new DbClient({
      appId: "redo-insert-test",
    });

    const users = db.collection<{ name: string }>("users");

    await users.insert({
      name: "John",
    });

    await db.undo();

    expect(await users.count()).toBe(0);

    await db.redo();

    expect(await users.count()).toBe(1);

    const docs = await users.find();

    expect(docs[0]?.name).toBe("John");
  });

  it("undoes an update", async () => {
    const db = new DbClient({
      appId: "undo-update-test",
    });

    const users = db.collection<{ name: string }>("users");

    const inserted = await users.insert({
      name: "John",
    });

    await users.update(
      { name: "John" },
      {
        $set: {
          name: "Jane",
        },
      }
    );

    let updated = await users.findById(inserted.id);

    expect(updated?.name).toBe("Jane");

    await db.undo();

    updated = await users.findById(inserted.id);

    expect(updated?.name).toBe("John");
  });

  it("redoes an update", async () => {
    const db = new DbClient({
      appId: "redo-update-test",
    });

    const users = db.collection<{ name: string }>("users");

    const inserted = await users.insert({
      name: "John",
    });

    await users.update(
      { name: "John" },
      {
        $set: {
          name: "Jane",
        },
      }
    );

    await db.undo();

    let doc = await users.findById(inserted.id);

    expect(doc?.name).toBe("John");

    await db.redo();

    doc = await users.findById(inserted.id);

    expect(doc?.name).toBe("Jane");
  });

  it("undoes a delete", async () => {
    const db = new DbClient({
      appId: "undo-delete-test",
    });

    const users = db.collection<{ name: string }>("users");

    const inserted = await users.insert({
      name: "John",
    });

    await users.delete({
      name: "John",
    });

    expect(await users.count()).toBe(0);

    await db.undo();

    expect(await users.count()).toBe(1);

    const restored = await users.findById(inserted.id);

    expect(restored?.name).toBe("John");
  });

  it("clears redo history after new mutation", async () => {
    const db = new DbClient({
      appId: "redo-clear-test",
    });

    const users = db.collection<{ name: string }>("users");

    await users.insert({
      name: "John",
    });

    await db.undo();

    await users.insert({
      name: "Jane",
    });

    await expect(db.redo()).rejects.toThrow();
  });

  it("throws when undo history is empty", async () => {
    const db = new DbClient({
      appId: "empty-undo-test",
    });

    await expect(db.undo()).rejects.toThrow();
  });

  it("throws when redo history is empty", async () => {
    const db = new DbClient({
      appId: "empty-redo-test",
    });

    await expect(db.redo()).rejects.toThrow();
  });

  it("supports multiple undo and redo operations", async () => {
    const db = new DbClient({
      appId: "multiple-undo-redo-test",
    });

    const users = db.collection<{ name: string }>("users");

    await users.insert({ name: "A" });
    await users.insert({ name: "B" });
    await users.insert({ name: "C" });

    expect(await users.count()).toBe(3);

    await db.undo();
    expect(await users.count()).toBe(2);

    await db.undo();
    expect(await users.count()).toBe(1);

    await db.redo();
    expect(await users.count()).toBe(2);

    await db.redo();
    expect(await users.count()).toBe(3);
  });
});
