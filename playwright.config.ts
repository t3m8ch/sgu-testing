import { defineConfig } from '@playwright/test';
import { manualCaptcha } from './support/config.js';

// Playwright otherwise attaches a raw accessibility snapshot, including values of input fields.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: manualCaptcha ? 180_000 : 75_000,
  expect: { timeout: 8_000 },
  reporter: [
    ['list'],
    [
      'allure-playwright',
      {
        resultsDir: process.env.ALLURE_RESULTS_DIR || 'allure-results',
        detail: false,
      },
    ],
    ...(process.env.PLAYWRIGHT_JUNIT_OUTPUT_FILE ? [['junit'] as const] : []),
  ],
  use: {
    baseURL: process.env.NVS_BASE_URL || 'https://nvs-stroy.ru',
    browserName: 'chromium',
    headless: !manualCaptcha,
    locale: 'ru-RU',
    viewport: { width: 1440, height: 1000 },
    navigationTimeout: 20_000,
    actionTimeout: 10_000,
    screenshot: 'off',
    trace: 'off',
    video: 'off',
    ...(process.env.CHROMIUM_EXECUTABLE_PATH
      ? {
          launchOptions: {
            executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
          },
        }
      : {}),
  },
});
