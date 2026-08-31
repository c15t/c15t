import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium } from 'playwright';

function createDeferredPromise(run) {
	const deferred = Promise.withResolvers();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
}

const PORT = 3111;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TITLE_SELECTOR = 'text=We value your privacy';
const EXPECTED_COLOR = 'rgb(239, 68, 68)';
const CUSTOMIZE_SELECTOR = 'button:has-text("Customize")';
const EXPECTED_PADDING = '8px 12px';
const EXPECTED_BACKGROUND = 'rgb(255, 255, 255)';

const waitForServer = async function waitForServer(url, timeoutMs = 15_000) {
	const startedAt = Date.now();

	while (Date.now() - startedAt < timeoutMs) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {}

		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		await delay(250);
	}

	throw new Error(`Timed out waiting for ${url}`);
};

const main = async function main() {
	const server = spawn(
		'./node_modules/.bin/next',
		['start', '--port', String(PORT)],
		{
			cwd: process.cwd(),
			stdio: 'inherit',
		}
	);

	try {
		await waitForServer(BASE_URL);

		const browser = await chromium.launch({ headless: true });
		try {
			const page = await browser.newPage({
				viewport: { height: 900, width: 1280 },
			});
			await page.goto(BASE_URL, { waitUntil: 'networkidle' });

			const title = page.locator(TITLE_SELECTOR).first();
			await title.waitFor();

			const color = await title.evaluate(
				(element) => window.getComputedStyle(element).color
			);

			if (color !== EXPECTED_COLOR) {
				throw new Error(
					`Expected ${TITLE_SELECTOR} color to be ${EXPECTED_COLOR}, received ${color}`
				);
			}

			const customize = page.locator(CUSTOMIZE_SELECTOR).first();
			await customize.waitFor();

			const buttonStyles = await customize.evaluate((element) => {
				const styles = window.getComputedStyle(element);
				return {
					backgroundColor: styles.backgroundColor,
					padding: styles.padding,
				};
			});

			if (buttonStyles.padding !== EXPECTED_PADDING) {
				throw new Error(
					`Expected ${CUSTOMIZE_SELECTOR} padding to be ${EXPECTED_PADDING}, received ${buttonStyles.padding}`
				);
			}

			if (buttonStyles.backgroundColor !== EXPECTED_BACKGROUND) {
				throw new Error(
					`Expected ${CUSTOMIZE_SELECTOR} background to be ${EXPECTED_BACKGROUND}, received ${buttonStyles.backgroundColor}`
				);
			}
		} finally {
			await browser.close();
		}
	} finally {
		server.kill('SIGTERM');
		await createDeferredPromise((resolve) => server.once('exit', resolve));
	}
};

try {
	await main();
} catch (error) {
	console.error(error);
	process.exitCode = 1;
}
