import { defineConfig } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: './test/e2e',
  reporter: 'list',
  // The tests share one database, so they run one at a time.
  workers: 1,
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: 'pnpm migrate && pnpm build && pnpm start',
    url: `http://localhost:${port}/health`,
    // TEST_AUTH=1 binds the test token verifier; it is honoured only when NODE_ENV=test.
    env: { PORT: String(port), NODE_ENV: 'test', TEST_AUTH: '1' },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
