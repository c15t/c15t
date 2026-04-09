import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const COMPONENT_CSS_MODULES = [
	'consent-banner',
	'consent-dialog',
	'consent-dialog-trigger',
	'consent-widget',
	'frame',
	'iab-consent-banner',
	'iab-consent-dialog',
] as const;

const PRIMITIVE_CSS_MODULES = [
	'accordion',
	'button',
	'legal-links',
	'preference-item',
	'switch',
] as const;

/**
 * Style-loader runtime markers that must NOT appear in .module.js class maps.
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

/**
 * Verify that CSS module exports resolve correctly:
 * - `.module.css` exports point to real CSS assets in dist/
 * - `.module.js` exports point to JS class-name maps in dist/
 */
describe('package exports: .module.css resolves to CSS assets in dist/', () => {
	for (const name of COMPONENT_CSS_MODULES) {
		test(`@c15t/ui/styles/components/${name}.module.css → dist CSS asset`, async () => {
			const subpath = `./styles/components/${name}.module.css`;
			const resolved = import.meta.resolve(`@c15t/ui/${subpath.slice(2)}`);
			const resolvedPath = resolved.replace('file://', '');

			// Must resolve to dist/, not src/
			expect(resolvedPath).toContain('/dist/');
			expect(resolvedPath).not.toContain('/src/');

			// Must be a real CSS file, not a JS bundle
			expect(resolvedPath).toMatch(/\.module\.css$/);
		});
	}
});

describe('package exports: .module.js resolves to JS class maps in dist/', () => {
	for (const name of COMPONENT_CSS_MODULES) {
		test(`@c15t/ui/styles/components/${name}.module.js → dist JS class map`, async () => {
			const resolved = import.meta.resolve(
				`@c15t/ui/styles/components/${name}.module.js`
			);
			const resolvedPath = resolved.replace('file://', '');

			expect(resolvedPath).toContain('/dist/');
			expect(resolvedPath).not.toContain('/src/');
			expect(resolvedPath).toMatch(/\.module\.(js|cjs)$/);
		});
	}

	for (const name of PRIMITIVE_CSS_MODULES) {
		test(`@c15t/ui/styles/primitives/${name}.module.js → dist JS class map`, async () => {
			const resolved = import.meta.resolve(
				`@c15t/ui/styles/primitives/${name}.module.js`
			);
			const resolvedPath = resolved.replace('file://', '');

			expect(resolvedPath).toContain('/dist/');
			expect(resolvedPath).not.toContain('/src/');
			expect(resolvedPath).toMatch(/\.module\.(js|cjs)$/);
		});
	}
});

describe('package exports: .module.js files contain no style-loader runtime', () => {
	for (const name of COMPONENT_CSS_MODULES) {
		test(`components/${name}.module.js has no style-injection runtime`, async () => {
			const resolved = import.meta.resolve(
				`@c15t/ui/styles/components/${name}.module.js`
			);
			const resolvedPath = resolved.replace('file://', '');
			const contents = readFileSync(resolvedPath, 'utf-8');

			for (const marker of STYLE_LOADER_MARKERS) {
				expect(contents).not.toContain(marker);
			}
		});
	}

	for (const name of PRIMITIVE_CSS_MODULES) {
		test(`primitives/${name}.module.js has no style-injection runtime`, async () => {
			const resolved = import.meta.resolve(
				`@c15t/ui/styles/primitives/${name}.module.js`
			);
			const resolvedPath = resolved.replace('file://', '');
			const contents = readFileSync(resolvedPath, 'utf-8');

			for (const marker of STYLE_LOADER_MARKERS) {
				expect(contents).not.toContain(marker);
			}
		});
	}
});
