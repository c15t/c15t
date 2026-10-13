/**
 * Builds a fixture project for production, serves it and clicks through
 * the installed items in Chromium: banner, dialog, trigger, widget and
 * gate, then the sheet in place of the dialog.
 *
 * The fixture's consent manager talks to the demo backend in its env file,
 * so the run needs network access, and the banner only shows where that
 * backend's policy asks for one.
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import type { Browser, BrowserContext, Locator, Page } from 'playwright';

import type { Framework } from '../src/items';
import { freePort, run, start } from './fixture-process';

export interface BrowserFixture {
	dir: string;
	framework: Framework;
	/** The installed `consent-manager.tsx`. */
	manager: string;
	log: string;
	/** Prefix for failure screenshots. */
	screenshots: string;
}

// English copy from @c15t/translations.
const copy = {
	acceptAll: 'Accept All',
	bannerTitle: 'We value your privacy',
	close: 'Close',
	// The demo policy picks one, depending on where the visitor is.
	customize: /^(?:Customize|Manage preferences)$/u,
	embed: 'Marketing embed',
	enableMarketing: 'Enable Marketing consent',
	marketing: 'Marketing',
	preferences: 'Manage preferences',
	rejectAll: 'Reject All',
	save: 'Save Settings',
} as const;

const timeout = 15_000;

const step = async (name: string, action: () => Promise<void>) => {
	try {
		await action();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${name}: ${message}`, { cause: error });
	}
};

const waitForChecked = async (
	name: string,
	control: Locator,
	checked: boolean
) => {
	const deadline = Date.now() + timeout;
	// oxlint-disable-next-line no-await-in-loop -- Polls the switch state.
	while ((await control.isChecked()) !== checked) {
		if (Date.now() > deadline) {
			throw new Error(
				`${name} stayed ${checked ? 'unchecked' : 'checked'} for ${timeout}ms`
			);
		}
		// oxlint-disable-next-line no-await-in-loop -- Polls the switch state.
		await sleep(100);
	}
};

/**
 * Whether the server rendered the banner, for a request with the context's
 * cookies. Next.js also serializes the translations into the page, so the
 * title only counts as element text.
 */
const serverRendersBanner = async (context: BrowserContext, url: string) => {
	const response = await context.request.get(url);
	return (await response.text()).includes(`>${copy.bannerTitle}<`);
};

const elements = (page: Page) => {
	const main = page.getByRole('main');
	const dialog = page.getByRole('dialog');
	return {
		banner: page.getByRole('region', { name: copy.bannerTitle }),
		dialog,
		dialogSwitch: dialog.getByRole('switch', {
			exact: true,
			name: copy.marketing,
		}),
		embed: main.getByText(copy.embed),
		gateButton: main.getByRole('button', { name: copy.enableMarketing }),
		main,
		trigger: page.getByRole('button', { name: copy.preferences }),
		widgetSwitch: main.getByRole('switch', {
			exact: true,
			name: copy.marketing,
		}),
	};
};

/** Collects uncaught errors and console errors from every page in the context. */
const watchErrors = (context: BrowserContext): string[] => {
	const errors: string[] = [];
	context.on('page', (page) => {
		page.on('pageerror', (error) => errors.push(error.message));
		page.on('console', (message) => {
			if (message.type() === 'error') {
				errors.push(message.text());
			}
		});
	});
	return errors;
};

/** The first HTML has the banner, and once the visitor chooses it doesn't. */
const serverRenderJourney = async (page: Page, url: string) => {
	const context = page.context();
	const ui = elements(page);
	await step('first visit', async () => {
		if (!(await serverRendersBanner(context, url))) {
			throw new Error('the HTML has no banner');
		}
	});
	await step('return visit', async () => {
		await page.goto(url);
		await ui.banner.getByRole('button', { name: copy.acceptAll }).click();
		await ui.banner.waitFor({ state: 'hidden' });
		if (await serverRendersBanner(context, url)) {
			throw new Error('the HTML still has the banner');
		}
	});
};

/** First visit: choose through the dialog, then change it from the trigger, the widget and the gate. */
const dialogJourney = async (page: Page, url: string) => {
	const context = page.context();
	const ui = elements(page);

	await step('banner shows', async () => {
		await page.goto(url);
		await ui.banner.waitFor();
		await ui.gateButton.waitFor();
		if ((await ui.embed.count()) > 0) {
			throw new Error('the marketing embed rendered before consent');
		}
	});
	await step('banner opens the dialog', async () => {
		await ui.banner.getByRole('button', { name: copy.customize }).click();
		await ui.dialog.waitFor();
	});
	await step('dialog saves a switch', async () => {
		await waitForChecked('Marketing', ui.dialogSwitch, false);
		await ui.dialogSwitch.click();
		await waitForChecked('Marketing', ui.dialogSwitch, true);
		await ui.dialog.getByRole('button', { name: copy.save }).click();
		await ui.dialog.waitFor({ state: 'hidden' });
		await ui.banner.waitFor({ state: 'hidden' });
		await ui.embed.waitFor();
		const cookies = await context.cookies();
		if (!cookies.some((cookie) => cookie.name === 'c15t')) {
			throw new Error('no c15t cookie after saving');
		}
	});
	await step('trigger reopens the dialog', async () => {
		await ui.trigger.click();
		await ui.dialog.waitFor();
		await waitForChecked('Marketing', ui.dialogSwitch, true);
	});
	await step('close button closes the dialog', async () => {
		await ui.dialog.getByRole('button', { name: copy.close }).click();
		await ui.dialog.waitFor({ state: 'hidden' });
	});
	await step('Escape closes the dialog', async () => {
		await ui.trigger.click();
		await ui.dialog.waitFor();
		await page.keyboard.press('Escape');
		await ui.dialog.waitFor({ state: 'hidden' });
	});
	await step('widget withdraws consent', async () => {
		await waitForChecked('widget Marketing', ui.widgetSwitch, true);
		await ui.widgetSwitch.click();
		await waitForChecked('widget Marketing', ui.widgetSwitch, false);
		await ui.main.getByRole('button', { name: copy.save }).click();
		await ui.gateButton.waitFor();
		await ui.embed.waitFor({ state: 'hidden' });
	});
	await step('gate asks for consent', async () => {
		await ui.gateButton.click();
		await ui.dialog.waitFor();
		await ui.dialog.getByRole('button', { name: copy.acceptAll }).click();
		await ui.dialog.waitFor({ state: 'hidden' });
		await ui.embed.waitFor();
	});
	await step('return visit keeps consent', async () => {
		await page.reload();
		await ui.embed.waitFor();
		if (await ui.banner.isVisible()) {
			throw new Error('the banner showed again');
		}
	});
};

/** First visit: reject from the banner, and the gate stays closed after a reload. */
const rejectJourney = async (page: Page, url: string) => {
	const ui = elements(page);
	await step('banner rejects', async () => {
		await page.goto(url);
		await ui.banner.getByRole('button', { name: copy.rejectAll }).click();
		await ui.banner.waitFor({ state: 'hidden' });
		await ui.gateButton.waitFor();
	});
	await step('return visit keeps the rejection', async () => {
		await page.reload();
		await ui.gateButton.waitFor();
		if (await ui.banner.isVisible()) {
			throw new Error('the banner showed again');
		}
	});
};

/** The consent manager renders ConsentSheet in place of ConsentDialog. */
const sheetJourney = async (page: Page, url: string) => {
	const ui = elements(page);
	await step('banner opens the sheet', async () => {
		await page.goto(url);
		await ui.banner.getByRole('button', { name: copy.customize }).click();
		await ui.dialog.waitFor();
	});
	await step('sheet saves a switch', async () => {
		await ui.dialogSwitch.click();
		await waitForChecked('Marketing', ui.dialogSwitch, true);
		await ui.dialog.getByRole('button', { name: copy.save }).click();
		await ui.dialog.waitFor({ state: 'hidden' });
		await ui.embed.waitFor();
	});
	await step('trigger opens the sheet and close button closes it', async () => {
		await ui.trigger.click();
		await ui.dialog.waitFor();
		await ui.dialog.getByRole('button', { name: copy.close }).click();
		await ui.dialog.waitFor({ state: 'hidden' });
	});
};

type Journey = (page: Page, url: string) => Promise<void>;

/** Runs a journey in a fresh browser context. Returns why it failed. */
const runJourney = async (
	browser: Browser,
	url: string,
	journey: Journey,
	fixture: BrowserFixture,
	label: string
): Promise<string | undefined> => {
	const context = await browser.newContext();
	context.setDefaultTimeout(timeout);
	const errors = watchErrors(context);
	const page = await context.newPage();
	try {
		await journey(page, url);
		if (errors.length > 0) {
			return `${label}: errors in the browser console:\n  ${errors.join('\n  ')}`;
		}
		return undefined;
	} catch (error) {
		const screenshot = `${fixture.screenshots}-${label}.png`;
		await page.screenshot({ fullPage: true, path: screenshot }).catch(() => {
			// The page may be gone.
		});
		const message = error instanceof Error ? error.message : String(error);
		appendFileSync(fixture.log, `\n${label} failed: ${message}\n`);
		const first = message.split('\n')[0] ?? message;
		const consoleErrors =
			errors.length > 0 ? `\n  console: ${errors.join('\n  console: ')}` : '';
		return `${label}: ${first}. Screenshot: ${screenshot}${consoleErrors}`;
	} finally {
		await context.close();
	}
};

const serve = async (
	fixture: BrowserFixture,
	variant: string,
	check: (url: string) => Promise<string[]>
): Promise<string[]> => {
	const bin = (name: string) =>
		path.join(fixture.dir, 'node_modules/.bin', name);
	const tool = fixture.framework === 'next' ? bin('next') : bin('vite');
	if (!(await run(tool, ['build'], fixture.dir, fixture.log))) {
		return [`${variant}: production build failed`];
	}
	const port = await freePort();
	const serveArgs =
		fixture.framework === 'next'
			? ['start', '--port', String(port), '--hostname', '127.0.0.1']
			: [
					'preview',
					'--port',
					String(port),
					'--strictPort',
					'--host',
					'127.0.0.1',
				];
	const url = `http://127.0.0.1:${port}/`;
	const stop = await start(tool, serveArgs, fixture.dir, fixture.log, url);
	try {
		return await check(url);
	} finally {
		await stop();
	}
};

/**
 * Builds the fixture twice, once with the dialog and once with the sheet,
 * and runs the journeys against each production server.
 *
 * @returns Why each failed journey failed. Empty when all passed.
 */
export const checkInBrowser = async (
	fixture: BrowserFixture,
	browser: Browser
): Promise<string[]> => {
	const failures = await serve(fixture, 'dialog', async (url) => {
		const results = [
			await runJourney(browser, url, dialogJourney, fixture, 'dialog'),
			await runJourney(browser, url, rejectJourney, fixture, 'reject'),
		];
		// The React fixture renders in the browser only.
		if (fixture.framework !== 'react') {
			results.push(
				await runJourney(
					browser,
					url,
					serverRenderJourney,
					fixture,
					'server-render'
				)
			);
		}
		return results.filter((result) => result !== undefined);
	});

	const manager = readFileSync(fixture.manager, 'utf8');
	const withSheet = manager
		.replaceAll('ConsentDialog', 'ConsentSheet')
		.replaceAll('consent-dialog', 'consent-sheet');
	writeFileSync(fixture.manager, withSheet);
	try {
		failures.push(
			...(await serve(fixture, 'sheet', async (url) => {
				const result = await runJourney(
					browser,
					url,
					sheetJourney,
					fixture,
					'sheet'
				);
				return result ? [result] : [];
			}))
		);
	} finally {
		writeFileSync(fixture.manager, manager);
	}
	return failures;
};
