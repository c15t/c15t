import { defineConfig, devices } from '@playwright/test';

/**
 * Parity runner Playwright config.
 *
 * Both Storybooks must be running before the suite is invoked. In CI the
 * `test:parity` turbo task boots them and waits for readiness before
 * invoking `playwright test`; locally, use:
 *
 *   PORT=6006 bun --cwd apps/storybook-react storybook &
 *   PORT=6007 bun --cwd apps/storybook-svelte storybook &
 *   bun --cwd apps/parity-runner test
 */
export default defineConfig({
	testDir: './tests',
	/** Each spec owns its own tmp dir; no need for isolation via parallelism. */
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [['list'], ['html', { open: 'never' }]],
	expect: {
		/** Screenshot-diff tolerance. Keep tight; real diffs should be real. */
		toHaveScreenshot: {
			maxDiffPixelRatio: 0.01,
			threshold: 0.2,
		},
	},
	use: {
		actionTimeout: 10_000,
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
