import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const PORT = 3111;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TITLE_SELECTOR = 'text=We value your privacy';
const EXPECTED_COLOR = 'rgb(239, 68, 68)';
const CUSTOMIZE_SELECTOR = 'button:has-text("Customize")';
const EXPECTED_PADDING = '8px 12px';
const EXPECTED_BACKGROUND = 'rgb(255, 255, 255)';

async function waitForServer(url, timeoutMs = 15_000) {
	const startedAt = Date.now();

	while (Date.now() - startedAt < timeoutMs) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {}

		await delay(250);
	}

	throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
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
				viewport: { width: 1280, height: 900 },
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
					padding: styles.padding,
					backgroundColor: styles.backgroundColor,
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
		await new Promise((resolve) => server.once('exit', resolve));
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
