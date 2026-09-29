/**
 * Guards the default theme tokens that `generate-css-entrypoints.ts` bakes
 * into the render-blocking stylesheets (`styles.css`, `styles.tw3.css`). The
 * IAB, dialog and primitive sheets load next to one of those and carry no
 * second copy.
 *
 * Without them every component rule resolves `var(--c15t-surface)`,
 * `var(--c15t-radius-lg)` and friends against nothing, and an app that imports
 * the stylesheet without passing a `theme` renders the banner unstyled.
 *
 * These read the built artifacts, so `bun run --cwd packages/ui build` (or
 * `turbo run build --filter=@c15t/ui`, which `test` depends on) must have run.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, test } from 'vitest';

import {
	defaultTheme,
	generateDefaultThemeCSS,
	themeToVars,
} from '../../theme/utils';

const DIST_DIR = join(__dirname, '..', '..', '..', 'dist');

const ENTRYPOINTS = ['styles.css', 'styles.tw3.css'];

/** Sheets that load next to `styles.css` and must not repeat its tokens. */
const COMPANION_SHEETS = [
	join('iab', 'styles.css'),
	join('iab', 'styles.tw3.css'),
	join('styles', 'dialog.css'),
	join('styles', 'primitives.css'),
];

const readEntrypoint = function readEntrypoint(relativePath: string): string {
	const path = join(DIST_DIR, relativePath);

	if (!existsSync(path)) {
		throw new Error(
			`Missing ${path}. Build @c15t/ui first: bun run --cwd packages/ui build`
		);
	}

	return readFileSync(path, 'utf8');
};

const findBlockStart = function findBlockStart(
	css: string,
	selector: string
): number {
	const pattern = selector
		.split(',')
		.map((part) => part.trim().replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
		.join('\\s*,\\s*');
	return css.search(new RegExp(`${pattern}\\s*\\{`, 'u'));
};

/**
 * Slice out one `selector { ... }` block by brace matching, so nested blocks
 * inside the stylesheet do not truncate it early.
 */
const readBlock = function readBlock(
	css: string,
	selector: string
): string | null {
	const start = findBlockStart(css, selector);

	if (start === -1) {
		return null;
	}

	const bodyStart = css.indexOf('{', start) + 1;
	let depth = 1;

	for (let index = bodyStart; index < css.length; index += 1) {
		const char = css[index];

		if (char === '{') {
			depth += 1;
		} else if (char === '}') {
			depth -= 1;

			if (depth === 0) {
				return css.slice(bodyStart, index);
			}
		}
	}

	return null;
};

const LIGHT_SELECTOR = ':root, :host, .c15t-theme-root';
const DARK_SELECTOR = [
	':root.dark',
	':host(.dark)',
	'.dark .c15t-theme-root',
	':root.c15t-dark',
	':host(.c15t-dark)',
	'.c15t-dark .c15t-theme-root',
].join(', ');

describe.each(ENTRYPOINTS)('%s', (entrypoint) => {
	const css = readEntrypoint(entrypoint);

	test('defines every light token themeToVars(defaultTheme) emits', () => {
		const block = readBlock(css, LIGHT_SELECTOR);
		expect(block).not.toBeNull();

		for (const [name, value] of Object.entries(
			themeToVars(defaultTheme, false)
		)) {
			expect(block).toContain(`${name}: ${value};`);
		}
	});

	test('defines every dark token themeToVars(defaultTheme, true) emits', () => {
		const block = readBlock(css, DARK_SELECTOR);
		expect(block).not.toBeNull();

		for (const [name, value] of Object.entries(
			themeToVars(defaultTheme, true)
		)) {
			expect(block).toContain(`${name}: ${value};`);
		}
	});

	test('scopes every :root block to :host too, for shadow-root hosts', () => {
		// A bare `:root{` (component variables) or `:root.x{` without a
		// `:host` twin would leave a shadow-root banner unstyled.
		const bare =
			css.match(/(?:^|[\s,}{;]):root(?:\.[A-Za-z0-9_-]+)?\s*\{/gu) ?? [];
		expect(bare).toEqual([]);
		expect(css).toMatch(/:root\s*,\s*:host/u);
	});

	test('emits the tokens first, so they read as the file preamble', () => {
		// Only the layer order statement may precede them.
		const preamble = css.replace(/^@layer [^;{]+;\s*/u, '');
		expect(preamble.startsWith('/* default theme tokens')).toBe(true);
	});

	test('matches the defaults serialized from defaultTheme', () => {
		// Byte-for-byte parity with the runtime serializer is what keeps CSS
		// and JS from drifting.
		expect(css).toContain(generateDefaultThemeCSS(defaultTheme));
	});

	test('emits the tokens unlayered', () => {
		// Unlayered, so a host's own unlayered `:root` overrides placed after
		// the stylesheet still win by source order, as they always have. A
		// `generateThemeCSS` theme wins by specificity wherever it lands.
		const layerStart = css.indexOf('@layer components');
		const tokensStart = findBlockStart(css, LIGHT_SELECTOR);
		expect(tokensStart).toBeGreaterThanOrEqual(0);
		const tokensEnd = css.indexOf('}', tokensStart);

		expect(tokensEnd).toBeLessThan(layerStart === -1 ? Infinity : layerStart);
	});
});

describe.each(COMPANION_SHEETS)('%s', (entrypoint) => {
	const css = readEntrypoint(entrypoint);

	test('does not repeat the default tokens', () => {
		expect(findBlockStart(css, LIGHT_SELECTOR)).toBe(-1);
		expect(findBlockStart(css, DARK_SELECTOR)).toBe(-1);
		expect(css).not.toContain('--c15t-surface:');
	});

	test('scopes every :root block to :host too, for shadow-root hosts', () => {
		const bare =
			css.match(/(?:^|[\s,}{;]):root(?:\.[A-Za-z0-9_-]+)?\s*\{/gu) ?? [];
		expect(bare).toEqual([]);
	});
});

describe('surface font variables', () => {
	/**
	 * `typography.fontFamily` reaches the page as `--c15t-font-family`. A
	 * surface whose own font variable hardcodes a stack instead ignores the
	 * theme: the preference list did, so its category rows kept the system
	 * font under a themed dialog title.
	 */
	const fontVariables = [
		readEntrypoint('styles.css'),
		readEntrypoint(join('iab', 'styles.css')),
	].flatMap((css) =>
		[
			...css.matchAll(
				/(?<name>--(?:iab-)?(?:consent|cd)-[a-z-]*font-family)\s*:\s*(?<value>[^;}]+)/gu
			),
		].map((match) => [match.groups?.name, match.groups?.value?.trim()])
	);

	test('the sheets declare them', () => {
		expect(fontVariables.map(([name]) => name)).toEqual(
			expect.arrayContaining([
				'--consent-banner-font-family',
				'--consent-dialog-font-family',
				'--consent-manager-font-family',
				'--iab-consent-banner-font-family',
				'--iab-cd-font-family',
			])
		);
	});

	test('every one resolves through --c15t-font-family', () => {
		expect(
			fontVariables.filter(([, value]) => value !== 'var(--c15t-font-family)')
		).toEqual([]);
	});
});

describe('an app that imports the stylesheet without a theme', () => {
	beforeEach(() => {
		document.head.innerHTML = '';
		document.documentElement.className = '';
	});

	/**
	 * jsdom's CSS parser rejects the whole stylesheet — it does not understand
	 * `@layer`, `color-mix()` or range media queries — and a rejected sheet
	 * contributes nothing to the cascade. Mount the real artifact's token
	 * preamble instead: still the shipped bytes, minus the layer order
	 * statement and the component rules jsdom could not apply anyway.
	 */
	const mountStylesheet = function mountStylesheet() {
		const css = readEntrypoint('styles.css');
		const tokensStart = css.indexOf('/* default theme tokens');
		const componentsStart = css.indexOf('/* primitives/');
		expect(tokensStart).toBeGreaterThanOrEqual(0);
		expect(componentsStart).toBeGreaterThan(tokensStart);

		const style = document.createElement('style');
		style.textContent = css.slice(tokensStart, componentsStart);
		document.head.appendChild(style);
	};

	test('resolves the base tokens on :root', () => {
		mountStylesheet();

		const computed = getComputedStyle(document.documentElement);

		expect(computed.getPropertyValue('--c15t-surface')).toBe(
			defaultTheme.colors.surface
		);
		expect(computed.getPropertyValue('--c15t-radius-lg')).toBe(
			defaultTheme.radius.lg
		);
		expect(computed.getPropertyValue('--c15t-font-family')).toBe(
			defaultTheme.typography.fontFamily
		);
	});

	test('lets a provider-injected <style id="c15t-theme"> override them', () => {
		mountStylesheet();

		const injected = document.createElement('style');
		injected.id = 'c15t-theme';
		injected.textContent = `${LIGHT_SELECTOR} { --c15t-surface: rebeccapurple; }`;
		document.head.appendChild(injected);

		expect(
			getComputedStyle(document.documentElement).getPropertyValue(
				'--c15t-surface'
			)
		).toBe('rebeccapurple');
	});
});
