/**
 * Benchmark suite for ZerithDB collection indexing algorithms.
 *
 * Resolves Issue #33: "Implement automated benchmark tests for collection
 * indexing" — https://github.com/Zerith-Labs/ZerithDB/issues/33
 *
 * Coverage:
 *  - Bulk insert (1 000 documents)
 *  - Single document insert
 *  - findById  (lookup by indexed primary key `_id`)
 *  - find() with exact-match filter (unindexed field)
 *  - find() with range operator $gte / $lte (unindexed field)
 *  - find() with $in operator
 *  - Bulk update matching a filter
 *  - Delete matching a filter
 *
 * Run with:
 *   pnpm --filter zerithdb-db vitest bench
 */

import { bench, describe, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { DbClient } from "../db-client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserDoc {
  name: string;
  age: number;
  role: "admin" | "user" | "guest";
  active: boolean;
  score: number;
  region: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a unique DbClient so each bench run starts with a clean DB. */
function createDb(): DbClient {
  return new DbClient({
    appId: "bench-" + Math.random().toString(36).slice(2, 10),
  });
}

/** Build N synthetic UserDoc objects. */
function buildUsers(n: number): UserDoc[] {
  const roles: UserDoc["role"][] = ["admin", "user", "guest"];
  const regions = ["us-east", "us-west", "eu-central", "ap-south"];
  return Array.from({ length: n }, (_, i) => ({
    name: `User ${i}`,
    age: 18 + (i % 60),
    role: roles[i % roles.length]!,
    active: i % 3 !== 0,
    score: Math.round(Math.random() * 10_000),
    region: regions[i % regions.length]!,
  }));
}

const SMALL = 100;   // fast micro-benchmarks
const MEDIUM = 500;  // realistic dataset
const LARGE = 1_000; // stress test

// ── 1. INSERT benchmarks ──────────────────────────────────────────────────────

describe("insert — single document", () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("insert 1 document", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insert(buildUsers(1)[0]!);
  });
});

describe(`insertMany — bulk ${SMALL} documents`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench(`insertMany ${SMALL} docs`, async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(SMALL));
  });
});

describe(`insertMany — bulk ${MEDIUM} documents`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench(`insertMany ${MEDIUM} docs`, async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(MEDIUM));
  });
});

describe(`insertMany — bulk ${LARGE} documents`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench(`insertMany ${LARGE} docs`, async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(LARGE));
  });
});

// ── 2. QUERY benchmarks ───────────────────────────────────────────────────────

describe(`query — findById (indexed primary key) in ${MEDIUM} docs`, () => {
  let db: DbClient;
  let targetId: string;

  afterEach(async () => {
    await db.dispose();
  });

  bench("findById", async () => {
    // Setup: fresh db with MEDIUM docs
    db = createDb();
    const users = db.collection<UserDoc>("users");
    const results = await users.insertMany(buildUsers(MEDIUM));
    // Pick the middle document so we do not accidentally hit a best-case edge
    targetId = results[Math.floor(MEDIUM / 2)]!.id;

    // Benchmark: indexed primary-key lookup
    await users.findById(targetId);
  });
});

describe(`query — find() exact match (unindexed field) in ${MEDIUM} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("find by role = 'admin'", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(MEDIUM));

    await users.find({ role: "admin" });
  });
});

describe(`query — find() boolean filter in ${MEDIUM} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("find active=true", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(MEDIUM));

    await users.find({ active: true });
  });
});

describe(`query — find() $gte range filter in ${LARGE} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("find age $gte 40", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(LARGE));

    await users.find({ age: { $gte: 40 } });
  });
});

describe(`query — find() $lte range filter in ${LARGE} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("find score $lte 5000", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(LARGE));

    await users.find({ score: { $lte: 5_000 } });
  });
});

describe(`query — find() compound $gte + $lte range in ${LARGE} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("find age $gte 30 AND $lte 50", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(LARGE));

    await users.find({ age: { $gte: 30, $lte: 50 } });
  });
});

describe(`query — find() $in operator in ${LARGE} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("find role $in ['admin','user']", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(LARGE));

    await users.find({ role: { $in: ["admin", "user"] } });
  });
});

describe(`query — find() multi-field compound filter in ${LARGE} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("find active=true AND role='admin'", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(LARGE));

    await users.find({ active: true, role: "admin" });
  });
});

// ── 3. UPDATE benchmarks ──────────────────────────────────────────────────────

describe(`update — bulk $set matching filter in ${MEDIUM} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("update role='guest' → active=false", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(MEDIUM));

    await users.update({ role: "guest" }, { $set: { active: false } });
  });
});

describe(`update — bulk $set with range filter in ${LARGE} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("update age $gte 50 → score=0", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(LARGE));

    await users.update({ age: { $gte: 50 } }, { $set: { score: 0 } });
  });
});

describe(`update — $unset field in ${MEDIUM} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("$unset region for role='user'", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(MEDIUM));

    await users.update({ role: "user" }, { $unset: { region: true } });
  });
});

// ── 4. DELETE benchmarks ──────────────────────────────────────────────────────

describe(`delete — matching filter in ${MEDIUM} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("delete active=false docs", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(MEDIUM));

    await users.delete({ active: false });
  });
});

describe(`delete — range filter in ${LARGE} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("delete age $gte 60", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(LARGE));

    await users.delete({ age: { $gte: 60 } });
  });
});

// ── 5. COUNT benchmark ────────────────────────────────────────────────────────

describe(`count — aggregate over ${LARGE} docs`, () => {
  let db: DbClient;

  afterEach(async () => {
    await db.dispose();
  });

  bench("count all docs", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(LARGE));

    await users.count();
  });

  bench("count with filter role='admin'", async () => {
    db = createDb();
    const users = db.collection<UserDoc>("users");
    await users.insertMany(buildUsers(LARGE));

    await users.count({ role: "admin" });
  });
});
