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
const visitId = 'ac2025bb-d674-4f94-b528-4f4b48bf7806';

describe('init visit measurement opt-in', () => {
	it('preserves an explicit opt-in through response validation', () => {
		expect(
			v.parse(initOutputSchema, {
				...response,
				visitTracking: { enabled: true, visitId },
			}).visitTracking
		).toEqual({ enabled: true, visitId });
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
			v.safeParse(initOutputSchema, {
				...response,
				visitTracking: { enabled, visitId },
			}).success
		).toBe(false);
	});
	it.each([
		undefined,
		'not-a-uuid',
	])('rejects missing or invalid visit IDs: %j', (id) => {
		expect(
			v.safeParse(initOutputSchema, {
				...response,
				visitTracking: { enabled: true, visitId: id },
			}).success
		).toBe(false);
	});
});
