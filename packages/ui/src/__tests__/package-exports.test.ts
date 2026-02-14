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
	'switch',
] as const;

/**
 * Verify that component CSS module exports resolve to pre-compiled JS bundles
 * in dist/, not raw .css source files in src/.
 *
 * Raw CSS modules from node_modules are silently ignored by Next.js/Turbopack,
 * resulting in completely unstyled components with no build errors.
 */
describe('package exports: component CSS modules resolve to compiled JS', () => {
	for (const name of COMPONENT_CSS_MODULES) {
		test(`@c15t/ui/styles/components/${name}.module.css → dist (not src)`, async () => {
			const subpath = `./styles/components/${name}.module.css`;
			const resolved = import.meta.resolve(`@c15t/ui/${subpath.slice(2)}`);
			const resolvedPath = resolved.replace('file://', '');

			// Must resolve to dist/, not src/
			expect(resolvedPath).toContain('/dist/');
			expect(resolvedPath).not.toContain('/src/');

			// Must be a JS bundle, not raw CSS
			expect(resolvedPath).toMatch(/\.module\.(js|cjs)$/);
		});

		test(`@c15t/ui/styles/components/${name}.module.js → dist (not src)`, async () => {
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
		test(`@c15t/ui/styles/primitives/${name}.module.js → dist (not src)`, async () => {
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
