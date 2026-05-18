#!/usr/bin/env node
// scripts/setup-git-config.js
//
// Registers the custom `ours-then-install` merge driver for pnpm-lock.yaml.
// This driver:
//   1. Accepts the incoming (theirs) version of the lockfile — avoiding
//      hundreds of conflict markers — then
//   2. Runs `pnpm install` to reconcile the result so node_modules stays
//      consistent.

const { execSync } = require("child_process");

console.log("🔧  Registering pnpm-lock.yaml merge driver...");

try {
  // %O = base,  %A = ours (written in-place),  %B = theirs
  // We copy %B (upstream version) into %A (our working copy), then install.
  const driverCmd =
    process.platform === "win32" ? "copy %B %A && pnpm install" : "cp %B %A && pnpm install";

  execSync(
    `git config merge.ours-then-install.name "Accept incoming lockfile, then run pnpm install"`,
    { stdio: "inherit" }
  );

  execSync(`git config merge.ours-then-install.driver "${driverCmd}"`, {
    stdio: "inherit",
  });

  console.log("✅  Done. Git will now resolve pnpm-lock.yaml conflicts automatically.");
} catch (error) {
  console.error("Error setting up git config:", error.message);
  process.exit(1);
}
