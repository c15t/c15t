import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { initOutputSchema } from './init';

const response = {
	jurisdiction: 'GDPR',
	location: { countryCode: 'DE', regionCode: null },
	branding: 'c15t',
	translations: {
		language: 'en',
		translations: {
			common: {},
			cookieBanner: {},
			consentManagerDialog: {},
			consentTypes: {},
		},
	},
};

describe('init visit measurement opt-in', () => {
	it('preserves an explicit opt-in through response validation', () => {
		expect(
			v.parse(initOutputSchema, {
				...response,
				visitTracking: { enabled: true },
			}).visitTracking
		).toEqual({ enabled: true });
	});
	it('continues to accept older responses without enabling measurement', () => {
		expect(v.parse(initOutputSchema, response).visitTracking).toBeUndefined();
	});
	it.each([
		false,
		'true',
		1,
		undefined,
	])('rejects ambiguous opt-in %j', (enabled) => {
		expect(
			v.safeParse(initOutputSchema, { ...response, visitTracking: { enabled } })
				.success
		).toBe(false);
	});
});
