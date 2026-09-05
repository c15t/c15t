/**
 * Guards the default theme tokens that `generate-css-entrypoints.ts` bakes
 * into every published stylesheet.
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

import { defaultTheme, generateThemeCSS, themeToVars } from '../../theme/utils';

const DIST_DIR = join(__dirname, '..', '..', '..', 'dist');

const ENTRYPOINTS = [
	'styles.css',
	'styles.tw3.css',
	join('iab', 'styles.css'),
	join('iab', 'styles.tw3.css'),
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

/**
 * Slice out one `selector { ... }` block by brace matching, so nested blocks
 * inside the stylesheet do not truncate it early.
 */
const readBlock = function readBlock(
	css: string,
	selector: string
): string | null {
	const start = css.indexOf(`${selector} {`);

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

const LIGHT_SELECTOR = ':root, .c15t-theme-root';
const DARK_SELECTOR =
	':root.dark, .dark .c15t-theme-root, :root.c15t-dark, .c15t-dark .c15t-theme-root';

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

	test('emits the tokens first, so they read as the file preamble', () => {
		expect(css.startsWith('/* default theme tokens')).toBe(true);
	});

	test('matches what a host passing theme: defaultTheme would inject', () => {
		// Byte-for-byte parity with `generateThemeCSS(defaultTheme)` is what
		// keeps CSS and JS from drifting, and what makes the defaults behave
		// exactly like a provider-injected theme.
		expect(css).toContain(generateThemeCSS(defaultTheme));
	});

	test('emits the tokens unlayered', () => {
		// A provider's injected `<style id="c15t-theme">` is unlayered. Unlayered
		// declarations outrank every cascade layer, so keeping the defaults
		// unlayered too is what leaves source order — and therefore the injected
		// override — in charge. If a host imports this stylesheet into a layer
		// (`@import ... layer(c15t)`, as examples/sveltekit-demo does), the
		// override wins by layer precedence instead.
		const layerStart = css.indexOf('@layer');
		const tokensEnd = css.indexOf('}', css.indexOf(LIGHT_SELECTOR));

		if (layerStart !== -1) {
			expect(tokensEnd).toBeLessThan(layerStart);
		}
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
	 * preamble instead: still the shipped bytes, minus the component rules
	 * jsdom could not apply anyway.
	 */
	const mountStylesheet = function mountStylesheet() {
		const css = readEntrypoint('styles.css');
		const componentsStart = css.indexOf('/* primitives/');
		expect(componentsStart).toBeGreaterThan(0);

		const style = document.createElement('style');
		style.textContent = css.slice(0, componentsStart);
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
