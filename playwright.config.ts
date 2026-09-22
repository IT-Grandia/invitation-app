import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  // Participants open the invitation from WhatsApp on their phones.
  projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }],
  webServer: {
    // Tested as a production build: next dev compiles on demand and hides
    // problems that only the build shows.
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      // Keeps test registrations out of the committee's spreadsheet and away
      // from Cloudflare; both are skipped when their keys are empty.
      GOOGLE_SHEET_ID: '',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '',
      TURNSTILE_SECRET_KEY: '',
    },
  },
})
