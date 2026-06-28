import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:5000',
    headless: true,
  },
  webServer: {
    command: 'npx next dev --port 5000',
    port: 5000,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
