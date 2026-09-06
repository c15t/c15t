import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ConsentRuntimeIABFactoryOptions } from '@c15t/core/runtime';
import { describe, expect, it } from 'vitest';

import { lazyCreateIAB, whenIABReady } from '../browser/iab';

const factoryOptions = {
	cmpId: 42,
	kernel: {
		getSnapshot: () => ({ consents: {}, iab: null }),
		set: { iab: () => undefined },
		subscribe: () => () => undefined,
	} as never,
} satisfies ConsentRuntimeIABFactoryOptions;

/**
 * The lazy-factory mechanics live in `@c15t/core/runtime` and are covered
 * there. What matters here is the wiring: the page's factory hands back a
 * usable handle before `@c15t/iab` has loaded, and forwards to the real
 * CMP once the import settles.
 */
describe('the page IAB factory', () => {
	it('returns a usable handle before the module has loaded', async () => {
		const handle = lazyCreateIAB(factoryOptions);

		expect(typeof handle.dispose).toBe('function');
		expect(handle.setPurposeConsent).toBeUndefined();

		await whenIABReady();
		expect(handle.setPurposeConsent).toBeTypeOf('function');
		handle.dispose();
	});
});

/**
 * The TCF preference centre is the larger half of the dialog island, and
 * only an IAB site opens it, so it has to stay behind a dynamic import.
 * The package's own test run has no Svelte compiler, so this asserts the
 * seam at the source level.
 */
describe('the dialog island', () => {
	it('reaches the IAB surface only through a dynamic import', () => {
		const source = readFileSync(
			join(
				process.cwd(),
				'src/components/islands/consent-dialog-surface.svelte'
			),
			'utf8'
		);

		expect(source).toContain("import('./iab-dialog-surface.svelte')");
		expect(source).not.toMatch(
			/^\s*import\s+[^;]*'\.\/iab-dialog-surface\.svelte'/mu
		);
	});
});
