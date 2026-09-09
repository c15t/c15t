/**
 * Browser coverage for the policy playground at `/policy`.
 *
 * Doubles as the end-to-end check for c15t/c15t#1025: a stored choice
 * must survive a reload with its original confirmation time, and
 * hydration must not record a new choice.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';

import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const port = process.env.C15T_EXAMPLE_TEST_PORT ?? '43129';
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

const openContext = async function openContext(): Promise<{
	context: BrowserContext;
	page: Page;
	errors: string[];
}> {
	const context = await browser.newContext();
	await context.route('**/*', (route) =>
		new URL(route.request().url()).origin === origin
			? route.continue()
			: route.abort()
	);
	const page = await context.newPage();
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	return { context, errors, page };
};

const storedConfirmedAt = async function storedConfirmedAt(
	page: Page
): Promise<string> {
	const locator = page.getByTestId('playground-stored-confirmed-at');
	await expect
		.poll(() => locator.getAttribute('data-confirmed-at'), { timeout: 5000 })
		.not.toBe('');
	return (await locator.getAttribute('data-confirmed-at')) ?? '';
};

it('keeps the stored confirmation time across a reload and does not re-record the choice', async () => {
	const { context, page, errors } = await openContext();
	try {
		await page.goto(`${origin}/policy`);
		await page.getByTestId('playground-prompt').waitFor();
		expect(
			await page.getByTestId('playground-prompt').getAttribute('data-kind')
		).toBe('choice');

		await page.getByTestId('playground-accept').click();
		const confirmedAt = await storedConfirmedAt(page);
		expect(Number(confirmedAt)).toBeGreaterThan(0);
		await expect
			.poll(() =>
				page.getByTestId('playground-prompt').getAttribute('data-kind')
			)
			.toBe('none');
		await expect
			.poll(() => page.getByTestId('playground-events').textContent())
			.toContain('choice:recorded');

		// Give the reload a distinguishable clock, then hydrate from storage.
		await page.waitForTimeout(1100);
		await page.reload();
		await page.getByTestId('playground-prompt').waitFor();

		expect(await storedConfirmedAt(page)).toBe(confirmedAt);
		await expect
			.poll(() =>
				page.getByTestId('playground-prompt').getAttribute('data-kind')
			)
			.toBe('none');
		expect(
			await page
				.getByTestId('playground-permission-marketing')
				.getAttribute('data-effective')
		).toBe('on');
		// Hydration applies stored records; it never records a choice.
		await expect
			.poll(() => page.getByTestId('playground-events').textContent())
			.toContain('init:applied');
		expect(
			await page.getByTestId('playground-events').textContent()
		).not.toContain('choice:recorded');

		// A fresh explicit choice does move the clock.
		await page.getByTestId('playground-reject').click();
		await expect.poll(() => storedConfirmedAt(page)).not.toBe(confirmedAt);
		expect(
			await page
				.getByTestId('playground-permission-marketing')
				.getAttribute('data-effective')
		).toBe('off');
		expect(errors).toEqual([]);
	} finally {
		await context.close();
	}
});

it('honors GPC as an opt-out that an accept-all cannot override', async () => {
	const { context, page, errors } = await openContext();
	try {
		await page.goto(`${origin}/policy?preset=californiaOptIn`);
		await page.getByTestId('playground-prompt').waitFor();
		await page.getByLabel('Browser sends GPC').check();
		await page.getByTestId('playground-accept').click();

		const marketing = page.getByTestId('playground-permission-marketing');
		await expect
			.poll(() => marketing.getAttribute('data-restrictions'))
			.toBe('gpc');
		expect(await marketing.getAttribute('data-effective')).toBe('off');
		expect(
			await page
				.getByTestId('playground-permission-functionality')
				.getAttribute('data-effective')
		).toBe('on');
		expect(errors).toEqual([]);
	} finally {
		await context.close();
	}
});

it('shows validation errors for a prompt the model does not allow', async () => {
	const { context, page, errors } = await openContext();
	try {
		await page.goto(`${origin}/policy?preset=worldOptOutNoPrompt`);
		await page.getByTestId('playground-prompt').waitFor();
		expect(
			await page.getByTestId('playground-prompt').getAttribute('data-kind')
		).toBe('none');
		await page.getByTestId('playground-valid').waitFor();

		await page.getByTestId('playground-model').selectOption('opt-in');
		// opt-in only allows a choice prompt, so the editor corrects it.
		await expect
			.poll(() => page.getByTestId('playground-prompt-select').inputValue())
			.toBe('choice');
		await expect
			.poll(() =>
				page.getByTestId('playground-prompt').getAttribute('data-kind')
			)
			.toBe('choice');
		expect(errors).toEqual([]);
	} finally {
		await context.close();
	}
});

it('keeps preferences reachable from the trigger toolbar after a notice is dismissed', async () => {
	const { context, page, errors } = await openContext();
	try {
		await page.goto(`${origin}/policy?preset=californiaOptOut`);
		await page.getByTestId('playground-prompt').waitFor();
		await page.getByTestId('playground-prompt-select').selectOption('notice');

		const dismiss = page.getByTestId('consent-banner-dismiss-button');
		await dismiss.waitFor();
		await dismiss.click();
		await expect
			.poll(() => page.getByTestId('consent-banner-root').count())
			.toBe(0);

		const toolbar = page.locator('[data-c15t-trigger-toolbar="true"]');
		await toolbar.waitFor();
		await toolbar.locator('[data-c15t-trigger-action="preferences"]').click();
		await page.getByTestId('consent-dialog-root').waitFor();
		expect(errors).toEqual([]);
	} finally {
		await context.close();
	}
});
