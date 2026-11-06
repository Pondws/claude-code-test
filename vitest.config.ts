import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/test-db-url.js";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Tests share one database, so run files serially.
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_ACCESS_SECRET: "test-secret-test-secret-test-secret-1234",
      APP_URL: "http://app.test",
      CORS_ORIGINS: "http://app.test",
      RATE_LIMIT_DISABLED: "true",
      MAX_FAILED_LOGINS: "3",
    },
  },
});
