/**
 * `NUXT_PUBLIC_INTH_PROJECT_URL` on a running server, applied the way Nuxt
 * applies `NUXT_PUBLIC_C15T_BACKEND_URL`.
 */
import { describe, expect, test } from 'vitest';

import { applyInthProjectURL } from '../runtime/server/inth-project-url';

const config = () => ({
	public: { c15t: { backendURL: 'https://build.example.com' } },
});

describe('applyInthProjectURL', () => {
	test('alone replaces the URL the build wrote', () => {
		const runtimeConfig = config();
		applyInthProjectURL(runtimeConfig, {
			NUXT_PUBLIC_INTH_PROJECT_URL: 'https://inth.example.com',
		});
		expect(runtimeConfig.public.c15t.backendURL).toBe(
			'https://inth.example.com'
		);
	});

	test('loses to NUXT_PUBLIC_C15T_BACKEND_URL, which Nuxt applies itself', () => {
		const runtimeConfig = config();
		applyInthProjectURL(runtimeConfig, {
			NUXT_PUBLIC_C15T_BACKEND_URL: 'https://c15t.example.com',
			NUXT_PUBLIC_INTH_PROJECT_URL: 'https://inth.example.com',
		});
		expect(runtimeConfig.public.c15t.backendURL).toBe(
			'https://build.example.com'
		);
	});

	test('treats an empty value as unset', () => {
		const runtimeConfig = config();
		applyInthProjectURL(runtimeConfig, { NUXT_PUBLIC_INTH_PROJECT_URL: '' });
		expect(runtimeConfig.public.c15t.backendURL).toBe(
			'https://build.example.com'
		);
	});
});
