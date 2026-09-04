import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium } from 'playwright';

const createDeferredPromise = function createDeferredPromise(run) {
	const deferred = Promise.withResolvers();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

/**
 * The v3 Tailwind override contract:
 *
 * - Tailwind 4: c15t rules live in `@layer components`; bare utilities
 *   (`bg-blue-600`) are layered after them and win without !important.
 * - Tailwind 3: no cascade layers exist (tw3 unwraps `@layer components`
 *   into plain rules), so c15t base selectors win over bare utilities by
 *   specificity — same semantics as v2. The supported override path is the
 *   important modifier (`!bg-blue-600`), which must always win. Base styles
 *   must also survive tw3's unlayered preflight.
 * - No Tailwind: components render fully styled from the v3 CSS alone.
 */
const apps = [
	{
		dir: 'benchmarks/tw3-test',
		env: 'tw3',
		expectBareUtilities: false,
		expectImportantUtilities: true,
		expectPreflightSurvival: true,
		label: 'Tailwind 3',
		port: 3211,
	},
	// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
	{
		env: 'tw4',
		label: 'Tailwind 4',
		port: 3212,
		dir: 'benchmarks/tw4-test',
		expectBareUtilities: true,
		// `!bg-blue-600` is Tailwind 3 prefix syntax (v4 uses a suffix);
		// tw4 already proves the stronger bare-utility contract.
		expectImportantUtilities: false,
		expectPreflightSurvival: false,
	},
	{
		dir: 'benchmarks/no-tw-test',
		env: 'no-tw',
		expectBareUtilities: false,
		expectImportantUtilities: false,
		expectPreflightSurvival: false,
		label: 'No Tailwind',
		port: 3213,
	},
];

/**
 * Computed values of `bg-blue-600 text-red-500 rounded-none`.
 * Tailwind 3 defines palette colors in rgb; Tailwind 4 uses oklch.
 */
const expectedTailwindButtonByEnv = {
	tw3: {
		backgroundColor: 'rgb(37, 99, 235)',
		borderRadius: '0px',
		color: 'rgb(239, 68, 68)',
	},
	tw4: {
		backgroundColor: 'oklch(0.546 0.245 262.881)',
		borderRadius: '0px',
		color: 'oklch(0.637 0.237 25.331)',
	},
};

/** V3_THEME colors.primary — proves tokens + data-variant chrome applied. */
const expectedThemePrimaryBackground = 'rgb(15, 23, 42)';

const startServer = function startServer(app) {
	return spawn(
		'./node_modules/.bin/next',
		['start', '--port', String(app.port)],
		{
			cwd: app.dir,
			stdio: ['ignore', 'pipe', 'pipe'],
		}
	);
};

const waitForServer = async function waitForServer(url, timeoutMs = 20_000) {
	const startedAt = Date.now();

	while (Date.now() - startedAt < timeoutMs) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {
			// The optional generated file may not exist.
		}

		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await delay(250);
	}

	throw new Error(`Timed out waiting for ${url}`);
};

const stopServer = async function stopServer(server) {
	if (server.exitCode !== null && server.exitCode !== undefined) {
		return;
	}

	server.kill('SIGTERM');
	await createDeferredPromise((resolve) => server.once('exit', resolve));
};

const assertEqual = function assertEqual(actual, expected, message) {
	if (actual !== expected) {
		throw new Error(`${message}: expected ${expected}, received ${actual}`);
	}
};

const assertNotTransparent = function assertNotTransparent(value, message) {
	if (
		value === 'rgba(0, 0, 0, 0)' ||
		value === 'transparent' ||
		value === 'rgb(0, 0, 0, 0)'
	) {
		throw new Error(`${message}: expected non-transparent, received ${value}`);
	}
};

const assertBorderIntact = function assertBorderIntact(styles, selector) {
	if (styles.borderTopStyle === 'none') {
		throw new Error(`${selector}: expected border style to survive preflight`);
	}

	if (Number.parseFloat(styles.borderTopWidth) <= 0) {
		throw new Error(
			`${selector}: expected border width > 0, received ${styles.borderTopWidth}`
		);
	}

	assertNotTransparent(
		styles.borderTopColor,
		`${selector}: expected border color to survive preflight`
	);
};

const readStyles = function readStyles(locator) {
	return locator.evaluate((element) => {
		const styles = window.getComputedStyle(element);
		return {
			backgroundColor: styles.backgroundColor,
			borderRadius: styles.borderRadius,
			borderTopColor: styles.borderTopColor,
			borderTopStyle: styles.borderTopStyle,
			borderTopWidth: styles.borderTopWidth,
			boxShadow: styles.boxShadow,
			color: styles.color,
			display: styles.display,
			padding: styles.padding,
		};
	});
};

const verifyBanner = async function verifyBanner(page, app) {
	await page.goto(`http://127.0.0.1:${app.port}/matrix/banner`, {
		waitUntil: 'networkidle',
	});

	const card = page.locator('[data-testid="consent-banner-card"]').first();
	await card.waitFor();

	const button = page
		.locator('[data-testid="consent-banner-accept-button"]')
		.first();
	await button.waitFor();

	const buttonStyles = await readStyles(button);

	if (app.expectBareUtilities) {
		// Tailwind 4: bare utilities beat @layer components without !important.
		for (const [key, expected] of Object.entries(
			expectedTailwindButtonByEnv[app.env]
		)) {
			assertEqual(
				buttonStyles[key],
				expected,
				`${app.label} v3 banner accept button ${key}`
			);
		}
	} else {
		// Tailwind 3 / no Tailwind: c15t base chrome wins — the accept button
		// (variant=primary, mode=filled) must show the theme primary color.
		assertEqual(
			buttonStyles.backgroundColor,
			expectedThemePrimaryBackground,
			`${app.label} v3 banner accept button theme primary background`
		);
	}

	assertNotTransparent(
		buttonStyles.backgroundColor,
		`${app.label} v3 banner accept button background`
	);

	if (app.expectImportantUtilities) {
		// Important-modifier utilities (`!bg-blue-600`, Tailwind 3 prefix
		// syntax) — the documented Tailwind 3 override path.
		const rejectButton = page
			.locator('[data-testid="consent-banner-reject-button"]')
			.first();
		await rejectButton.waitFor();
		const rejectStyles = await readStyles(rejectButton);

		for (const [key, expected] of Object.entries(
			expectedTailwindButtonByEnv[app.env]
		)) {
			assertEqual(
				rejectStyles[key],
				expected,
				`${app.label} v3 banner reject button important-utility ${key}`
			);
		}
	}

	if (app.expectPreflightSurvival) {
		if (buttonStyles.padding === '0px') {
			throw new Error(
				`${app.label} v3 banner accept button padding was stripped by preflight`
			);
		}
	}

	const cardStyles = await readStyles(card);
	assertNotTransparent(
		cardStyles.backgroundColor,
		`${app.label} v3 banner card background`
	);
	assertBorderIntact(cardStyles, `${app.label} v3 banner card`);
};

const verifyDialog = async function verifyDialog(page, app) {
	await page.goto(`http://127.0.0.1:${app.port}/matrix/dialog`, {
		waitUntil: 'networkidle',
	});

	const dialog = page.locator('[data-testid="consent-dialog-card"]').first();
	await dialog.waitFor();

	const dialogStyles = await readStyles(dialog);
	assertNotTransparent(
		dialogStyles.backgroundColor,
		`${app.label} v3 dialog card background`
	);
	assertBorderIntact(dialogStyles, `${app.label} v3 dialog card`);
};

const verifyWidget = async function verifyWidget(page, app) {
	await page.goto(`http://127.0.0.1:${app.port}/matrix/widget`, {
		waitUntil: 'networkidle',
	});

	const widget = page.locator('[data-testid="consent-widget-root"]').first();
	await widget.waitFor();

	// The widget root is intentionally transparent (inline embed); the
	// accordion items carry the visual chrome.
	const item = page
		.locator('[data-testid^="consent-widget-accordion-item-"]')
		.first();
	await item.waitFor();

	const itemStyles = await readStyles(item);
	assertNotTransparent(
		itemStyles.backgroundColor,
		`${app.label} v3 widget accordion item background`
	);
	assertBorderIntact(itemStyles, `${app.label} v3 widget accordion item`);
};

const verifyApp = async function verifyApp(browser, app) {
	const server = startServer(app);
	const stderr = [];
	server.stderr.on('data', (chunk) => stderr.push(chunk.toString()));

	try {
		await waitForServer(`http://127.0.0.1:${app.port}`);
		const page = await browser.newPage({
			viewport: { height: 900, width: 1280 },
		});

		try {
			await verifyBanner(page, app);
			await verifyDialog(page, app);
			await verifyWidget(page, app);
		} finally {
			await page.close();
		}
	} catch (error) {
		if (stderr.length > 0) {
			console.error(stderr.join(''));
		}
		throw error;
	} finally {
		await stopServer(server);
	}
};

const main = async function main() {
	const browser = await chromium.launch({ headless: true });

	try {
		await apps.reduce(async (previous, app) => {
			await previous;
			await verifyApp(browser, app);
			console.log(`✓ ${app.label} v3 CSS compatibility checks passed`);
		}, Promise.resolve());
	} finally {
		await browser.close();
	}
};

try {
	await main();
} catch (error) {
	console.error(error);
	process.exitCode = 1;
}
