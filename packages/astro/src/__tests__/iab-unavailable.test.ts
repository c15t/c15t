/**
 * The server render of a backend policy that uses the `iab` model.
 *
 * Only a site that sets `iab` mounts a CMP to answer for it, and the
 * standard banner does not handle the model, so a site without `iab` would
 * ship no working consent UI. The server render throws instead.
 */
import { IAB_UNAVAILABLE_ERROR_CODE } from '@c15t/core';
import { describe, expect, it, vi } from 'vitest';

import { resolveOptions } from '../integration';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions } from '../types';
import { iabInitResponse, SITE_WITHOUT_IAB } from './iab-policy-fixture';
import { testWire } from './policy-fixture';

const resolve = (
	options: C15tAstroOptions,
	respond: () => Response = () => iabInitResponse()
) =>
	resolveConsentContext({
		fetch: vi.fn(() => Promise.resolve(respond())) as never,
		headers: new Headers(),
		options: resolveOptions(options),
	});

describe('an `iab` policy in the server render', () => {
	it('throws on a site without `iab`', async () => {
		await expect(resolve(SITE_WITHOUT_IAB)).rejects.toMatchObject({
			code: IAB_UNAVAILABLE_ERROR_CODE,
			message:
				"c15t: this visitor's policy uses IAB TCF, but `iab` is not set. Set `iab` in the c15t() integration options in astro.config, or remove the IAB model from your policy.",
		});
	});

	it('resolves the IAB model on a site with `iab`', async () => {
		const locals = await resolve({ ...SITE_WITHOUT_IAB, iab: { cmpId: 28 } });

		expect(locals.snapshot.model).toBe('iab');
	});

	it('resolves as opt-in when the backend turns IAB off with `gvl: null`', async () => {
		const locals = await resolve(SITE_WITHOUT_IAB, () =>
			iabInitResponse('null')
		);

		expect(locals.snapshot.model).toBe('opt-in');
		expect(locals.shouldShowBanner).toBe(true);
	});

	it('resolves a policy that is not IAB', async () => {
		const locals = await resolve(SITE_WITHOUT_IAB, () =>
			Response.json({
				branding: 'c15t',
				cmpId: 28,
				location: { countryCode: null, regionCode: null },
				policyResolution: testWire({ categories: ['marketing'] }),
				translations: { language: 'en', translations: {} },
			})
		);

		expect(locals.shouldShowBanner).toBe(true);
	});
});
