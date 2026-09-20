/**
 * Reading the platform arm off the bridge, including what an unreadable answer
 * means.
 *
 * `unsupported` is the arm that lets tracking through without a platform yes, so
 * the failure this file guards is a payload nobody understood landing on it. A
 * renamed field would otherwise read as "this platform asks nothing of us", which
 * is the one wrong answer that turns tracking on rather than off.
 */

import { describe, expect, test } from 'vitest';

import {
	parseTrackingAuthorization,
	parseTrackingRequest,
	TRACKING_AUTHORIZATION_STATUSES,
} from '../tracking';

describe('parseTrackingAuthorization', () => {
	test.each(TRACKING_AUTHORIZATION_STATUSES)(
		'reads the `%s` arm a native core sent verbatim',
		(status) => {
			expect(parseTrackingAuthorization(JSON.stringify({ status }))).toBe(
				status
			);
		}
	);

	test.each([
		['text that is not JSON', 'not json at all'],
		['an empty payload', ''],
		['a JSON array', '[]'],
		['a bare string', '"authorized"'],
		['no status field', '{}'],
		['a null status', '{"status":null}'],
		['a status that is not a string', '{"status":true}'],
		['an arm this build never had', '{"status":"maybe"}'],
		['a renamed field', '{"trackingStatus":"authorized"}'],
	])('fails closed for %s', (_case, raw) => {
		const parsed = parseTrackingAuthorization(raw);

		// Denied rather than unsupported: an unreadable answer is not evidence that
		// the platform asks nothing, and this arm is checked against tracking that
		// would otherwise start.
		expect(parsed).toBe('denied');
		expect(parsed).not.toBe('unsupported');
	});

	test('ignores a field a newer native build added', () => {
		// The contract allows a newer core to add a field. Refusing the payload for
		// one would turn an additive native release into tracking that stays off.
		expect(
			parseTrackingAuthorization(
				JSON.stringify({ promptShown: true, status: 'authorized' })
			)
		).toBe('authorized');
	});
});

describe('parseTrackingRequest', () => {
	test('reads the arm, the stage, and the call that ran', () => {
		expect(
			parseTrackingRequest(
				JSON.stringify({
					presentation: 'expanded',
					stage: 'additional-information',
					status: 'not-determined',
				})
			)
		).toEqual({
			presentation: 'expanded',
			stage: 'additional-information',
			status: 'not-determined',
		});
	});

	test('reads a payload from a binary that predates the new fields', () => {
		// An older core sends one field. A reader that treated a missing stage as a pause
		// would open a preference centre on a device that has never heard of the expanded
		// sheet, so a missing field has to mean the answer the older payload meant.
		expect(parseTrackingRequest('{"status":"authorized"}')).toEqual({
			presentation: undefined,
			stage: 'final',
			status: 'authorized',
		});
	});

	test('falls back to a settled request for a stage this build cannot name', () => {
		expect(
			parseTrackingRequest('{"stage":"pending-review","status":"authorized"}')
		).toMatchObject({ presentation: undefined, stage: 'final' });
	});

	test('drops a presentation this build cannot name and keeps the rest', () => {
		expect(
			parseTrackingRequest('{"presentation":"fullscreen","status":"denied"}')
		).toEqual({ presentation: undefined, stage: 'final', status: 'denied' });
	});

	test.each([
		['text that is not JSON', 'not json at all'],
		['an empty payload', ''],
		['a JSON array', '[]'],
		['a bare string', '"authorized"'],
	])('fails closed for %s rather than inventing a pause', (_case, raw) => {
		const parsed = parseTrackingRequest(raw);

		// Same direction as the single-field reader: an unreadable answer is not
		// evidence that the platform asks nothing, and a stage this build cannot see
		// is not a reason to open a surface.
		expect(parsed.status).toBe('denied');
		expect(parsed.status).not.toBe('unsupported');
		expect(parsed.stage).toBe('final');
	});
});
