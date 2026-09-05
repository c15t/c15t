/**
 * `@c15t/iab` must not reach an app that did not ask for IAB.
 *
 * The provider sits in every SvelteKit app's layout chunk, so a static
 * import of the TCF implementation would cost ~15 KB gzipped on sites that
 * never show a TCF surface. Two things keep it out, and both are asserted
 * here: no module an app loads for the banner imports `@c15t/iab` for a
 * value, and the runtime only gets a `createIAB` — the thing that triggers
 * the dynamic import — when `iab` is configured.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { mount, unmount } from 'svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { isIABConfigured } from '../lib/iab-loader';
import { offline } from '../lib/transports/offline';
import type { ConsentManagerOptions } from '../lib/types';
import ProviderOnlyFixture from './fixtures/provider-only-fixture.svelte';

interface WindowWithTCF extends Window {
	__tcfapi?: unknown;
}

// jsdom gives `import.meta.url` a browser URL, so paths come off the
// Vitest root — the package directory.
const source = function source(relativePath: string): string {
	return readFileSync(join(process.cwd(), 'src/lib', relativePath), 'utf8');
};

const mounted: ReturnType<typeof mount>[] = [];

const mountProvider = function mountProvider(
	options: Partial<ConsentManagerOptions>
) {
	const target = document.createElement('div');
	document.body.append(target);
	const app = mount(ProviderOnlyFixture, {
		props: {
			options: {
				mode: offline(),
				persistence: false,
				...options,
			} as ConsentManagerOptions,
		},
		target,
	});
	mounted.push(app);
};

afterEach(() => {
	for (const app of mounted.splice(0)) {
		void unmount(app);
	}
	(window as WindowWithTCF).__tcfapi = undefined;
});

describe('lazy IAB loading', () => {
	test.each([
		'components/consent-manager-provider.svelte',
		'context.svelte.ts',
		'iab-loader.ts',
		'index.ts',
		'types.ts',
	])('%s has no value import of `@c15t/iab`', (file) => {
		const text = source(file);
		const imports = text.match(/^\s*import\s+(?!type\b)[^;]*'@c15t\/iab'/gmu);

		expect(imports).toBeNull();
	});

	test('never installs the CMP for a provider without `iab`', async () => {
		mountProvider({});

		await vi.waitFor(() => {
			expect(document.querySelector('[data-testid="render-child"]')).not.toBe(
				null
			);
		});
		// Long enough for a dynamic import to have landed, had one started.
		await sleep(50);
		expect((window as WindowWithTCF).__tcfapi).toBeUndefined();
	});

	test('loads the CMP once `iab` is configured', async () => {
		mountProvider({ iab: { cmpId: 42, enabled: true } });

		// The CMP arrives through a dynamic import, so the first run pays
		// for transforming `@c15t/iab` as well as loading it.
		await vi.waitFor(
			() => {
				expect((window as WindowWithTCF).__tcfapi).toBeTypeOf('function');
			},
			{ timeout: 10_000 }
		);
	});

	test('`isIABConfigured` matches what the runtime would mount', () => {
		expect(isIABConfigured(undefined)).toBe(false);
		expect(isIABConfigured(false)).toBe(false);
		expect(isIABConfigured({ cmpId: 42, enabled: false })).toBe(false);
		expect(isIABConfigured({ cmpId: 42 })).toBe(true);
		expect(isIABConfigured({ cmpId: 42, enabled: true })).toBe(true);
	});
});
