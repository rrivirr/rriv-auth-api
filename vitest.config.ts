import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    environment: "node",
    // The fake Keycloak binds a fixed port (used by KEYCLOAK_URL), so run test
    // files sequentially to avoid EADDRINUSE across files.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/server.ts", "src/winston.ts"],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
});
