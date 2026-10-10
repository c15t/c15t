/**
 * The Svelte `hosted()` defaults to the backend URL `consentManifest()`
 * read, as Vue's and React's do.
 */
import { afterEach, describe, expect, test } from 'vitest';

import { hosted } from '../index';
import { setGenerated } from './generated';

afterEach(() => {
	setGenerated({});
});

describe('hosted()', () => {
	test("uses the build's backend URL with no options", () => {
		setGenerated({ backendURL: 'https://consent.example.com' });
		expect({ ...hosted() }).toMatchObject({
			backendURL: 'https://consent.example.com',
			type: 'hosted',
		});
	});

	test('an explicit backendURL wins', () => {
		setGenerated({ backendURL: 'https://consent.example.com' });
		expect(hosted({ backendURL: '/api/c15t' }).backendURL).toBe('/api/c15t');
	});

	test('names the plugin and the variable when no URL is known', () => {
		expect(() => hosted()).toThrow(
			'c15t: hosted() has no backend URL. Add consentManifest() from @c15t/svelte/vite to vite.config.ts and set VITE_C15T_BACKEND_URL (or VITE_INTH_PROJECT_URL), or pass `backendURL`.'
		);
	});
});
