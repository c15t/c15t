// oxlint-disable no-loop-func -- Each sequential suite owns its browser context and request record.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import type {
	Browser,
	BrowserContext,
	BrowserContextOptions,
	Page,
} from 'playwright';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import { runCommand } from '../../../../scripts/browser-process';
import { acceptButton, openBrowserContext, privacySettings } from './browser';
import type { Requests } from './browser';
import { startPostgres } from './postgres';
import { startApp } from './server';
import {
	browserCdnPrefix,
	placeholderBackendURL,
	selectedStarterTargets,
} from './starter-targets';
import type { StarterTarget } from './starter-targets';
import { exampleEnvironment } from './targets';

const repository = fileURLToPath(new URL('../../../..', import.meta.url));
const browserDist = join(repository, 'packages/browser/dist');

// The same migration the starter runs on a development start, applied to
// the PostgreSQL database a production server requires.
const migrate = `
import { createMigrator } from '@c15t/backend';
const migrator = createMigrator({ dialect: 'postgres', url: process.env.DATABASE_URL });
try { await migrator.apply(); } finally { await migrator.dispose(); }
`;

const startStarter = async function startStarter(target: StarterTarget) {
	const cwd = join(repository, target.directory);
	const database = target.postgres ? await startPostgres() : undefined;
	try {
		const databaseEnv = database ? { DATABASE_URL: database.url } : {};
		if (database) {
			await runCommand(['node', '--input-type=module', '--eval', migrate], {
				cwd,
				env: { ...process.env, ...databaseEnv },
			});
		}
		const app = await startApp({
			build: target.build ?? ['run', 'build'],
			cwd,
			env: (backendURL, port) => ({
				...exampleEnvironment(backendURL, port),
				...target.env?.(backendURL),
				...databaseEnv,
			}),
			host: target.host,
			id: target.id,
			readyPath: target.routes[0] ?? '/',
			start: target.start,
		});
		return {
			...app,
			async close() {
				await app.close();
				await database?.close();
			},
		};
	} catch (error) {
		await database?.close();
		throw error;
	}
};

for (const target of selectedStarterTargets()) {
	describe(target.id, () => {
		let server: Awaited<ReturnType<typeof startStarter>>;
		let browser: Browser;
		let context: BrowserContext | undefined;
		let page: Page;
		let requests: Requests;

		beforeAll(async () => {
			server = await startStarter(target);
			browser = await chromium.launch({ headless: true });
		});
		afterAll(async () => {
			await browser?.close();
			await server?.close();
		});
		afterEach(async (result) => {
			if (!context) {
				return;
			}
			if (result.task.result?.state === 'fail') {
				const directory = join('artifacts', 'starters', target.id);
				await mkdir(directory, { recursive: true });
				const filename = result.task.name.replace(/[^a-z0-9]+/giu, '-');
				await page.screenshot({
					fullPage: true,
					path: join(directory, `${filename}.png`),
				});
				await context.tracing.stop({
					path: join(directory, `${filename}.zip`),
				});
			} else {
				await context.tracing.stop();
			}
			await context.close();
			context = undefined;
		});

		const open = async function open(options: BrowserContextOptions = {}) {
			({ context, page, requests } = await openBrowserContext(
				browser,
				server.baseURL,
				server.backendURL,
				false,
				options
			));
			if (target.placeholderBackend) {
				const pageOrigin = new URL(server.baseURL).origin;
				await context.route(`${placeholderBackendURL}/**`, async (route) => {
					const { pathname, search } = new URL(route.request().url());
					const response = await route.fetch({
						url: `${server.backendURL}${pathname}${search}`,
					});
					await route.fulfill({
						headers: {
							...response.headers(),
							'access-control-allow-credentials': 'true',
							'access-control-allow-origin': pageOrigin,
						},
						response,
					});
				});
			}
			await context.route(`${browserCdnPrefix}**`, async (route) => {
				const file = new URL(route.request().url()).pathname.slice(
					new URL(browserCdnPrefix).pathname.length
				);
				await route.fulfill({ path: join(browserDist, file) });
			});
		};

		for (const route of target.routes) {
			if (target.serverRendered) {
				test(`${route}: the first HTML response has the banner`, async () => {
					await open({ javaScriptEnabled: false });
					await page.goto(route);
					expect(await acceptButton(page).isVisible()).toBe(true);
					expect(requests.unexpected).toEqual([]);
				});
			}

			test(`${route}: Accept persists across a reload`, async () => {
				await open();
				await page.goto(route);
				await expect.poll(() => acceptButton(page).isVisible()).toBe(true);
				await acceptButton(page).click();
				await expect.poll(() => acceptButton(page).isVisible()).toBe(false);
				// Hiding the banner precedes the deferred save.
				await expect
					.poll(() => page.evaluate(() => localStorage.getItem('c15t')))
					.not.toBeNull();

				await page.reload({ waitUntil: 'networkidle' });
				await expect.poll(() => privacySettings(page).isVisible()).toBe(true);
				expect(await acceptButton(page).isVisible()).toBe(false);

				// The banner is gone, so the dialog is the preference dialog. Its
				// copy depends on the backend's translations.
				await privacySettings(page).click();
				await expect
					.poll(() => page.getByRole('dialog').first().isVisible())
					.toBe(true);
				expect(requests.unexpected).toEqual([]);
			});
		}
	});
}
