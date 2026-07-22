import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// vitest-pool-workers 0.18+ (Vitest 4): the runtime is wired in as a Vite plugin
// rather than the old `test.poolOptions.workers`. Tests run inside workerd via
// Miniflare, so global fetch, the Cache API, and the default export behave as in
// production. Isolated per-test storage rolls back Cache API writes between tests.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
    }),
  ],
});
