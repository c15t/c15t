import type { ConsentKernel } from '@c15t/core';
/**
 * A `manifestURL` passed to the Vue plugin's `manifest()` is fetched at
 * runtime, even when `consentManifest()` bundled a snapshot.
 */
import {
	createConsentManifestPolicyPack,
	policyRulePresets,
} from '@c15t/schema/types';
import type { ConsentManifest } from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, inject } from 'vue';

import { c15tVue, manifest } from '../index';
import { symbolKernel } from '../runtime/utils/symbols';
import { setGenerated } from './generated';

const manifestWithPolicy = (id: string): ConsentManifest => ({
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			...policyRulePresets.europeOptIn(),
			id,
			match: { isDefault: true },
		}),
	],
	revision: id,
	schemaVersion: 2,
});

beforeEach(() => {
	// What `consentManifest()` serves after a build that downloaded a snapshot.
	setGenerated({
		backendURL: 'https://consent.example.test',
		snapshot: manifestWithPolicy('bundled'),
	});
});

const MANIFEST_URL = 'https://cdn.example.test/manifest';

const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
	setGenerated({});
	vi.unstubAllGlobals();
});

const mountWith = function mountWith(
	mode: ReturnType<typeof manifest>
): () => ConsentKernel {
	let kernel: ConsentKernel | undefined;
	const container = document.createElement('div');
	document.body.append(container);
	const app = createApp(
		defineComponent({
			setup() {
				kernel = inject(symbolKernel);
				return () => h('main');
			},
		})
	);
	app.use(c15tVue, { mode });
	app.mount(container);
	cleanups.push(() => {
		app.unmount();
		container.remove();
	});
	return () => {
		if (!kernel) {
			throw new Error('Missing consent kernel');
		}
		return kernel;
	};
};

const policyIdOf = (kernel: ConsentKernel): string | undefined =>
	kernel.getSnapshot().resolution.policy?.id;

test('without a manifestURL, resolves from the bundled snapshot', async () => {
	const network = vi.fn(() =>
		Promise.resolve(new Response('{}', { status: 503 }))
	);
	vi.stubGlobal('fetch', network);

	const kernel = mountWith(manifest());

	await expect.poll(() => policyIdOf(kernel())).toBe('bundled');
	expect(network).not.toHaveBeenCalled();
});

test('a manifestURL is fetched at runtime and wins over the bundled snapshot', async () => {
	const network = vi.fn((input: RequestInfo | URL) =>
		Promise.resolve(
			String(input) === MANIFEST_URL
				? new Response(JSON.stringify(manifestWithPolicy('from-url')))
				: new Response('{}', { status: 503 })
		)
	);
	vi.stubGlobal('fetch', network);

	const kernel = mountWith(manifest({ manifestURL: MANIFEST_URL }));

	await expect.poll(() => policyIdOf(kernel())).toBe('from-url');
	expect(network.mock.calls.map(([input]) => String(input))).toEqual([
		MANIFEST_URL,
	]);
});
