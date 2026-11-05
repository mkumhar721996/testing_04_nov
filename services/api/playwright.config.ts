import { defineConfig } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: './test/e2e',
  reporter: 'list',
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: 'pnpm build && pnpm start',
    url: `http://localhost:${port}/health`,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
