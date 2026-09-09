const { defineConfig, devices } = require('@playwright/test');

/**
 * The site is static, so the whole suite runs against a plain file server.
 *
 * Functional and accessibility specs run on all three engines. Visual
 * regression runs on Chromium only, because that is the one engine whose
 * baselines can be generated in the authoring environment — Firefox and
 * WebKit binaries are not downloadable there. CI installs all three, so
 * behaviour is still verified everywhere on every pull request.
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  /**
   * An absolute pixel count, not a ratio.
   *
   * A 1% ratio sounds strict but scales with the image: on a 1440x900 section
   * it permits nearly 13,000 changed pixels. A real regression — the headline
   * mask clipping the descenders off "Engineering" and "reality" — moved only
   * 379 pixels, so it sat 34x under the threshold and the suite reported the
   * page unchanged.
   *
   * These renders have proven deterministic, matching byte for byte between
   * this machine and CI, because the fonts are self-hosted and there is no
   * system font substitution to vary. That makes a tight absolute budget
   * affordable: enough for stray anti-aliasing, not enough to hide a word.
   */
  expect: {
    toHaveScreenshot: { maxDiffPixels: 60, animations: 'disabled', scale: 'css' },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'npx --yes http-server . -p 4173 -c-1 --silent',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
