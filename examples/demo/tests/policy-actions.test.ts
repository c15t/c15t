import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';

import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const port = process.env.C15T_EXAMPLE_TEST_PORT ?? '43128';
const origin = `http://127.0.0.1:${port}`;
let browser: Browser;
let server: ChildProcess;

beforeAll(async () => {
	server = spawn(
		process.execPath,
		[
			require.resolve('next/dist/bin/next'),
			'start',
			'--hostname',
			'127.0.0.1',
			'--port',
			port,
		],
		{ cwd: new URL('..', import.meta.url), stdio: 'ignore' }
	);
	await vi.waitFor(
		async () => {
			if (server.exitCode !== null) {
				throw new Error(
					'Example server exited; build the demo before running browser tests.'
				);
			}
			expect((await fetch(origin)).ok).toBe(true);
		},
		{ interval: 200, timeout: 20_000 }
	);
	browser = await chromium.launch();
});

afterAll(async () => {
	await browser?.close();
	server?.kill('SIGTERM');
});

it.each(['default', 'stock', 'custom'])(
	'%s actions save an edited preference and preserve it when reopened',
	async (variant) => {
		const context = await browser.newContext();
		try {
			await context.route('**/*', (route) =>
				new URL(route.request().url()).origin === origin
					? route.continue()
					: route.abort()
			);
			const page = await context.newPage();
			const errors: string[] = [];
			page.on('pageerror', (error) => errors.push(error.message));
			await page.goto(`${origin}/policy-actions?country=ES`);
			await page.getByTestId('consent-banner-reject-button').click();
			if (variant !== 'default') {
				await page
					.getByRole('tab')
					.filter({ hasText: new RegExp(variant, 'iu') })
					.click();
			}
			await page
				.getByRole('button', { exact: true, name: 'Open dialog' })
				.click();
			await page.getByTestId('consent-widget-switch-measurement').click();
			await page
				.getByRole('button', { exact: true, name: 'Save Settings' })
				.click();
			await page.keyboard.press('Escape');
			await page.getByRole('dialog').waitFor({ state: 'hidden' });
			await page
				.getByRole('button', { exact: true, name: 'Open dialog' })
				.click();
			await page.getByRole('dialog').waitFor({ state: 'visible' });
			expect(
				await page
					.getByTestId('consent-widget-switch-measurement')
					.getAttribute('aria-checked')
			).toBe('true');
			expect(errors).toEqual([]);
		} finally {
			await context.close();
		}
	}
);
