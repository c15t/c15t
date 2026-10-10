/**
 * The Svelte `manifest()` defaults to what `consentManifest()` downloaded.
 */
import {
	createConsentManifestPolicyPack,
	policyRulePresets,
} from '@c15t/schema/types';
import type { ConsentManifest } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { manifest } from '../transports/manifest';
import { setGenerated } from './generated';

const BUILT: ConsentManifest = {
	branding: 'c15t',
	revision: 'built',
	schemaVersion: 2,
};

beforeEach(() => {
	setGenerated({ backendURL: 'https://consent.example.com', snapshot: BUILT });
});

afterEach(() => {
	setGenerated({});
});

describe('manifest()', () => {
	test("uses the build's snapshot and backend URL", () => {
		expect({ ...manifest() }).toMatchObject({
			backendURL: 'https://consent.example.com',
			kind: 'manifest',
			snapshot: BUILT,
			type: 'manifest',
		});
	});

	test("source: 'runtime' leaves the build's snapshot out", () => {
		const mode = manifest({ source: 'runtime' });
		expect(mode.snapshot).toBeUndefined();
		expect(mode.backendURL).toBe('https://consent.example.com');
	});

	test('options replace the defaults', () => {
		const own: ConsentManifest = { ...BUILT, revision: 'own' };
		expect({
			...manifest({ backendURL: 'https://other.example', snapshot: own }),
		}).toMatchObject({ backendURL: 'https://other.example', snapshot: own });
	});

	test("a manifestURL is fetched at runtime and wins over the build's snapshot", async () => {
		const manifestURL = 'https://cdn.example.com/manifest';
		const withPolicy = (id: string): ConsentManifest => ({
			...BUILT,
			policyPacks: [
				createConsentManifestPolicyPack({
					...policyRulePresets.europeOptIn(),
					id,
					match: { isDefault: true },
				}),
			],
		});
		setGenerated({
			backendURL: 'https://consent.example.com',
			snapshot: withPolicy('bundled'),
		});
		const fetch = vi.fn<typeof globalThis.fetch>(() =>
			Promise.resolve(new Response(JSON.stringify(withPolicy('from-url'))))
		);

		const transport = manifest({ fetch, manifestURL })();
		const init = await transport.init?.({
			overrides: {},
			user: null,
		} as unknown as Parameters<NonNullable<typeof transport.init>>[0]);

		expect(init?.policyResolution?.policy?.id).toBe('from-url');
		expect(fetch.mock.calls.map(([input]) => String(input))).toEqual([
			manifestURL,
		]);
	});
});
