/**
 * The Svelte `manifest()` defaults to what `consentManifest()` downloaded.
 */
import type { ConsentManifest } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

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
});
