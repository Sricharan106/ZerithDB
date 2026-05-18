import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    benchmark: {
      include: ["src/**/*.bench.ts"],
      exclude: ["node_modules", "dist"],
    },
    exclude: ["node_modules", "dist"],
  },
});
