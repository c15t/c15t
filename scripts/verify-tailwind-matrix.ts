/**
 * Tailwind CSS compatibility across frameworks.
 *
 * Serves every built fixture in `benchmarks/tailwind-matrix/{v3,v4}` and
 * checks, in Chromium, the contract the shared Tailwind docs page states:
 *
 * - c15t's component styles survive Tailwind's preflight: the banner card
 *   keeps its background and border, the header, footer and buttons keep
 *   their padding, and the lazily loaded dialog is styled too. On Tailwind 3
 *   this also proves the c15t rules were not purged.
 * - A utility passed to a c15t part wins over c15t's own rule for the same
 *   property: a bare utility on Tailwind 4, an important one (`!p-[7px]`)
 *   on Tailwind 3. The fixtures put padding on the banner root, which c15t
 *   also sets, so the check fails if the utility loses.
 * - A `dark` class on `<html>` turns on Tailwind's `dark:` variant for that
 *   utility and, where the fixture says c15t follows it, c15t's dark tokens.
 *   Vue components ship light tokens only, and the script tag's shadow root
 *   follows its own `colorScheme` option.
 * - Opening the dialog loads its stylesheet, which is styled too.
 *
 * Build first: `bun run compat:styles:build`.
 *
 * ```sh
 * bun run compat:styles:matrix
 * TAILWIND_MATRIX_VERSIONS=v3 TAILWIND_MATRIX_FIXTURES=vue,nuxt bun run compat:styles:matrix
 * ```
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { chromium } from 'playwright';
import type { Browser, Locator, Page } from 'playwright';

import { TAILWIND_MATRIX_FIXTURES } from '../benchmarks/tailwind-matrix/fixtures';
import type {
	TailwindMatrixFixture,
	TailwindMatrixPage,
} from '../benchmarks/tailwind-matrix/fixtures';
import { startStaticServer } from '../internals/next-compat/shared/src/suite/static-server';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '../packages/schema/src/types';
import type { InitOutput } from '../packages/schema/src/types';
import { translations as enTranslations } from '../packages/translations/src/translations/en';

const MATRIX_ROOT = resolve(
	import.meta.dirname,
	'../benchmarks/tailwind-matrix'
);
const VERSIONS = ['v3', 'v4'] as const;
type Version = (typeof VERSIONS)[number];

/** Padding the fixtures put on the banner root, light and dark. */
const SLOT_PADDING = { dark: '11px', light: '7px' } as const;

/**
 * `/init` for the adapters that have no offline mode (Vue and Nuxt). The
 * other fixtures use `offline()` with the same rule.
 */
const initResponse: InitOutput = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: 'DE',
			regionCode: null,
			rules: [
				{
					id: 'tailwind-matrix',
					match: { isDefault: true },
					model: 'opt-in',
					prompt: 'choice',
				},
			],
		})
	),
	translations: { language: 'en', translations: enTranslations },
};

const pick = function pick(name: string): Set<string> | undefined {
	const value = process.env[name];
	return value ? new Set(value.split(',').filter(Boolean)) : undefined;
};

const TRANSPARENT = new Set(['rgba(0, 0, 0, 0)', 'transparent']);

interface Styles {
	backgroundColor: string;
	borderTopColor: string;
	borderTopStyle: string;
	borderTopWidth: string;
	color: string;
	padding: string;
}

const readStyles = function readStyles(locator: Locator): Promise<Styles> {
	return locator.evaluate((element) => {
		const styles = window.getComputedStyle(element);
		return {
			backgroundColor: styles.backgroundColor,
			borderTopColor: styles.borderTopColor,
			borderTopStyle: styles.borderTopStyle,
			borderTopWidth: styles.borderTopWidth,
			color: styles.color,
			padding: styles.padding,
		};
	});
};

const hasPadding = (styles: Styles) =>
	styles.padding.split(' ').some((value) => Number.parseFloat(value) > 0);

const hasBorder = (styles: Styles) =>
	styles.borderTopStyle !== 'none' &&
	Number.parseFloat(styles.borderTopWidth) > 0 &&
	!TRANSPARENT.has(styles.borderTopColor);

const byTestId = (page: Page, id: string) =>
	page.locator(`[data-testid="${id}"]`).first();

/**
 * Checks one page and returns the failed expectations, empty on success.
 */
const checkPage = async function checkPage(
	page: Page,
	url: string,
	options: TailwindMatrixPage
): Promise<string[]> {
	const problems: string[] = [];
	const expect = (condition: boolean, message: string) => {
		if (!condition) {
			problems.push(message);
		}
	};

	await page.goto(url, { waitUntil: 'networkidle' });

	const probe = await readStyles(byTestId(page, 'tailwind-probe'));
	expect(
		!TRANSPARENT.has(probe.backgroundColor),
		'Tailwind utilities are missing from the page (probe has no background)'
	);

	const card = byTestId(page, 'consent-banner-card');
	await card.waitFor({ timeout: 15_000 });
	const [root, cardStyles, header, footer, accept] = await Promise.all([
		readStyles(byTestId(page, 'consent-banner-root')),
		readStyles(card),
		readStyles(byTestId(page, 'consent-banner-header')),
		readStyles(byTestId(page, 'consent-banner-footer')),
		readStyles(byTestId(page, 'consent-banner-accept-button')),
	]);
	expect(
		!TRANSPARENT.has(cardStyles.backgroundColor),
		`banner card lost its background (${cardStyles.backgroundColor})`
	);
	expect(
		hasBorder(cardStyles),
		`banner card lost its border (${cardStyles.borderTopStyle} ${cardStyles.borderTopWidth} ${cardStyles.borderTopColor})`
	);
	expect(hasPadding(header), `banner header lost its padding`);
	expect(hasPadding(footer), `banner footer lost its padding`);
	expect(hasPadding(accept), `accept button lost its padding`);
	expect(
		!TRANSPARENT.has(accept.backgroundColor),
		`accept button lost its background (${accept.backgroundColor})`
	);
	if (options.slots) {
		expect(
			root.padding === SLOT_PADDING.light,
			`utility on the banner root lost to c15t: padding ${root.padding}, expected ${SLOT_PADDING.light}`
		);
	}

	if (options.slots || options.darkTokens) {
		const title = byTestId(page, 'consent-banner-title');
		const lightTitle = await readStyles(title);
		await page.evaluate(() => {
			document.documentElement.classList.add('dark');
		});
		const [darkRoot, darkTitle] = await Promise.all([
			readStyles(byTestId(page, 'consent-banner-root')),
			readStyles(title),
		]);
		if (options.darkTokens) {
			expect(
				darkTitle.color !== lightTitle.color,
				`c15t ignored the dark class: title color stayed ${darkTitle.color}`
			);
		}
		if (options.slots) {
			expect(
				darkRoot.padding === SLOT_PADDING.dark,
				`dark: utility on the banner root did not apply: padding ${darkRoot.padding}, expected ${SLOT_PADDING.dark}`
			);
		}
		await page.evaluate(() => {
			document.documentElement.classList.remove('dark');
		});
	}

	await byTestId(page, 'consent-banner-customize-button').click();
	const dialogCard = byTestId(page, 'consent-dialog-card');
	try {
		await dialogCard.waitFor({ timeout: 15_000 });
		const dialog = await readStyles(dialogCard);
		expect(
			!TRANSPARENT.has(dialog.backgroundColor),
			`dialog card lost its background (${dialog.backgroundColor})`
		);
		expect(hasBorder(dialog), 'dialog card lost its border');
	} catch (error) {
		problems.push(`dialog did not open: ${String(error).split('\n')[0]}`);
	}

	return problems;
};

interface Result {
	version: Version;
	fixture: string;
	page: string;
	problems: string[];
}

const checkFixture = async function checkFixture(
	browser: Browser,
	version: Version,
	fixture: TailwindMatrixFixture
): Promise<Result[]> {
	const outDir = join(MATRIX_ROOT, version, fixture.id, fixture.outDir);
	const label = (page: TailwindMatrixPage) =>
		page.label ? `${fixture.label} (${page.label})` : fixture.label;
	if (!existsSync(outDir)) {
		return fixture.pages.map((page) => ({
			fixture: fixture.id,
			page: label(page),
			problems: [`missing build output ${outDir}`],
			version,
		}));
	}
	const server = await startStaticServer(outDir);
	const results: Result[] = [];
	try {
		for (const options of fixture.pages) {
			// oxlint-disable-next-line no-await-in-loop -- One page per server keeps failures attributable.
			const context = await browser.newContext({
				viewport: { height: 900, width: 1280 },
			});
			// oxlint-disable-next-line no-await-in-loop -- Registered before navigation.
			await context.route('**/api/c15t/**', async (route) => {
				const { pathname } = new URL(route.request().url());
				if (pathname.endsWith('/init')) {
					await route.fulfill({ json: initResponse });
					return;
				}
				await route.fulfill({ json: {} });
			});
			// oxlint-disable-next-line no-await-in-loop -- Pages share the fixture server.
			const page = await context.newPage();
			const errors: string[] = [];
			page.on('pageerror', (error) => errors.push(error.message));
			try {
				// oxlint-disable-next-line no-await-in-loop -- Sequential browser checks.
				const problems = await checkPage(
					page,
					`${server.url}${options.path}`,
					options
				);
				results.push({
					fixture: fixture.id,
					page: label(options),
					problems:
						problems.length > 0 && errors.length > 0
							? [...problems, `page errors: ${errors.join('; ')}`]
							: problems,
					version,
				});
			} catch (error) {
				results.push({
					fixture: fixture.id,
					page: label(options),
					problems: [
						String(error).split('\n')[0] ?? 'unknown error',
						...(errors.length > 0 ? [`page errors: ${errors.join('; ')}`] : []),
					],
					version,
				});
			} finally {
				// oxlint-disable-next-line no-await-in-loop -- Close before the next page.
				await context.close();
			}
		}
	} finally {
		await server.close();
	}
	return results;
};

const main = async function main() {
	const versions = pick('TAILWIND_MATRIX_VERSIONS');
	const fixtures = pick('TAILWIND_MATRIX_FIXTURES');
	const browser = await chromium.launch({ headless: true });
	const results: Result[] = [];
	try {
		for (const version of VERSIONS) {
			if (versions && !versions.has(version)) {
				continue;
			}
			for (const fixture of TAILWIND_MATRIX_FIXTURES) {
				if (fixtures && !fixtures.has(fixture.id)) {
					continue;
				}
				// oxlint-disable-next-line no-await-in-loop -- One static server at a time.
				const fixtureResults = await checkFixture(browser, version, fixture);
				results.push(...fixtureResults);
				for (const result of fixtureResults) {
					const status = result.problems.length === 0 ? 'ok' : 'FAIL';
					console.log(`${status} Tailwind ${version.slice(1)} ${result.page}`);
					for (const problem of result.problems) {
						console.log(`     ${problem}`);
					}
				}
			}
		}
	} finally {
		await browser.close();
	}

	const rows = results.map(
		(result) =>
			`| ${result.page} | ${result.version.slice(1)} | ${result.problems.length === 0 ? 'Passed' : `Failed: ${result.problems.join('; ')}`} |`
	);
	mkdirSync('.ci-reports', { recursive: true });
	writeFileSync(
		'.ci-reports/tailwind-matrix.md',
		`## Tailwind framework matrix\n\n| Framework | Tailwind | Result |\n| --- | --- | --- |\n${rows.join('\n')}\n`
	);
	const failures = results.filter((result) => result.problems.length > 0);
	if (failures.length > 0) {
		throw new Error(`${failures.length} Tailwind matrix cell(s) failed`);
	}
};

await main();
