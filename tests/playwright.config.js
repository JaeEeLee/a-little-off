import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT || 4173);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      // 지인들이 대부분 휴대폰으로 열어서, 휴대폰 크기의 크롬으로 시험한다
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 760 } }
    }
  ],
  webServer: {
    command: 'node server.mjs',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI
  }
});
