import { MINIMAL_GVL } from '@c15t/conformance/fixtures/gvl';
import { deferInitGvl } from '@c15t/core';

import { hostedMode } from '../mode';
import type { C15tAstroOptions } from '../types';
import { testWire } from './policy-fixture';

/**
 * What a backend answers for a policy that uses the `iab` model: the
 * policy plus its vendor list and CMP ID.
 *
 * @param gvl - `'inline'` sends the list itself; `'reference'` sends the
 * reference c15t's own init routes send in its place; `'null'` turns IAB
 * off for the request.
 * @returns A fresh `/init` response.
 */
export const iabInitResponse = function iabInitResponse(
	gvl: 'inline' | 'reference' | 'null' = 'inline'
): Response {
	const body = {
		branding: 'c15t',
		cmpId: 28,
		gvl: gvl === 'null' ? null : MINIMAL_GVL,
		location: { countryCode: null, regionCode: null },
		policyResolution: testWire({ categories: ['marketing'], model: 'iab' }),
		translations: { language: 'en', translations: {} },
	};
	return Response.json(
		gvl === 'reference'
			? deferInitGvl(body as never, 'https://consent.example.com/gvl')
			: body
	);
};

/** A hosted site that never set `iab`, with one marketing script. */
export const SITE_WITHOUT_IAB: C15tAstroOptions = {
	consentCategories: ['necessary', 'marketing'],
	mode: hostedMode({ url: 'https://consent.example.com' }),
	scripts: [
		{ category: 'marketing', id: 'pixel', src: 'https://example.com/pixel.js' },
	],
};
