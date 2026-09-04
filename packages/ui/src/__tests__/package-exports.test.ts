import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

const COMPONENT_STYLE_MODULES = [
	'accordion',
	'branding',
	'button',
	'collapsible',
	'consent-actions',
	'consent-banner',
	'consent-dialog',
	'consent-dialog-trigger',
	'consent-manager',
	'frame',
	'iab-consent-banner',
	'iab-consent-dialog',
	'legal-links',
	'preference-item',
	'switch',
	'tabs',
] as const;

const PRIMITIVE_CSS_MODULES = [
	'accordion',
	'button',
	'legal-links',
	'preference-item',
	'switch',
] as const;

/**
 * Style-loader runtime markers that must NOT appear in class maps.
 * Their presence means styles are being injected at runtime via JS instead of
 * being shipped as plain CSS assets.
 */
const STYLE_LOADER_MARKERS = [
	'document.createElement("style")',
	"document.createElement('style')",
	'insertBefore',
	'styleTagTransform',
	'injectStylesIntoStyleTag',
] as const;

const resolvePath = function resolvePath(specifier: string): string {
	return import.meta.resolve(specifier).replace('file://', '');
};

/**
 * Every component style ships as a flat triple under dist/styles/components:
 * `<name>.js` (class map), `<name>.css` (plain CSS), `<name>.d.ts`.
 */
describe('package exports: @c15t/ui/styles/components/<name> triple', () => {
	for (const name of COMPONENT_STYLE_MODULES) {
		test(`@c15t/ui/styles/components/${name} → dist JS class map`, () => {
			const resolvedPath = resolvePath(`@c15t/ui/styles/components/${name}`);

			expect(resolvedPath).toContain('/dist/styles/components/');
			expect(resolvedPath).not.toContain('/src/');
			expect(resolvedPath).toMatch(new RegExp(`/${name}\\.js$`, 'u'));
		});

		test(`@c15t/ui/styles/components/${name}.css → dist CSS asset`, () => {
			const resolvedPath = resolvePath(
				`@c15t/ui/styles/components/${name}.css`
			);

			expect(resolvedPath).toContain('/dist/styles/components/');
			expect(resolvedPath).toMatch(new RegExp(`/${name}\\.css$`, 'u'));
			expect(readFileSync(resolvedPath, 'utf-8')).toContain('c15t-ui-');
		});

		test(`@c15t/ui/styles/components/${name}.module.css → dist JS class map`, () => {
			const resolvedPath = resolvePath(
				`@c15t/ui/styles/components/${name}.module.css`
			);

			expect(resolvedPath).toContain('/dist/styles/components/');
			expect(resolvedPath).toMatch(new RegExp(`/${name}\\.js$`, 'u'));
		});

		test(`components/${name}.js has no style-injection runtime`, () => {
			const contents = readFileSync(
				resolvePath(`@c15t/ui/styles/components/${name}`),
				'utf-8'
			);

			expect(contents).toContain(`./${name}.css`);
			for (const marker of STYLE_LOADER_MARKERS) {
				expect(contents).not.toContain(marker);
			}
		});
	}
});

describe('package exports: .module.js resolves to JS class maps in dist/', () => {
	for (const name of PRIMITIVE_CSS_MODULES) {
		test(`@c15t/ui/styles/primitives/${name}.module.js → dist JS class map`, () => {
			const resolvedPath = resolvePath(
				`@c15t/ui/styles/primitives/${name}.module.js`
			);

			expect(resolvedPath).toContain('/dist/');
			expect(resolvedPath).not.toContain('/src/');
			// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
			expect(resolvedPath).toMatch(/\.module\.(js|cjs)$/u);
		});

		test(`primitives/${name}.module.js has no style-injection runtime`, () => {
			const contents = readFileSync(
				resolvePath(`@c15t/ui/styles/primitives/${name}.module.js`),
				'utf-8'
			);

			for (const marker of STYLE_LOADER_MARKERS) {
				expect(contents).not.toContain(marker);
			}
		});
	}
});

describe('package exports: aggregated stylesheets', () => {
	for (const entry of [
		'styles.css',
		'styles.tw3.css',
		'iab/styles.css',
		'iab/styles.tw3.css',
	]) {
		test(`@c15t/ui/${entry} aggregates component rules`, () => {
			const resolvedPath = resolvePath(`@c15t/ui/${entry}`);
			const contents = readFileSync(resolvedPath, 'utf-8');

			expect(resolvedPath).toContain('/dist/');
			expect(contents).toContain('c15t-ui-');
			expect(contents).toContain('@keyframes');
			if (entry.endsWith('.tw3.css')) {
				expect(contents).not.toMatch(/@layer\b/u);
			} else {
				expect(contents).toContain('@layer components');
			}
		});
	}
});
