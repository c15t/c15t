/**
 * The two questions an Apple tracking pause leaves behind, answered without a bridge.
 *
 * Apple's Additional Information button closes its sheet with no answer recorded and still
 * reports `not-determined`, so the app decides what the pause means. These cases pin both
 * halves of that decision: the sheet comes back while a category the request stood for is
 * granted, and a subject who refused all of them is finished.
 */

import { describe, expect, test } from 'vitest';

import type { TrackingRequestPayload } from '../../protocol';
import {
	DEFAULT_TRACKING_CATEGORIES,
	isAdditionalInformationPause,
	MAX_TRACKING_REQUEST_TURNS,
	mayAskPlatformAgain,
} from '../tracking-journey';

describe('mayAskPlatformAgain', () => {
	test('comes back to Apple while one of the named categories is granted', () => {
		expect(
			mayAskPlatformAgain(['marketing', 'measurement'], {
				marketing: 'granted',
				measurement: 'denied',
			})
		).toBe(true);
	});

	test('stops when every named category was refused', () => {
		// Sending someone to a tracking prompt whose answer their own choices have already
		// overridden is worse than not asking, and Apple's sheet cannot see a c15t category.
		expect(
			mayAskPlatformAgain(['marketing', 'measurement'], {
				marketing: 'denied',
				measurement: 'denied',
			})
		).toBe(false);
	});

	test('treats an unresolved category as no answer rather than a yes', () => {
		// `pending` is a wait, and a platform prompt does not end a wait. Reading it as
		// granted would spend Apple's prompt on a policy that has not resolved.
		expect(mayAskPlatformAgain(['marketing'], { marketing: 'pending' })).toBe(
			false
		);
	});

	test('reads only the categories it was given', () => {
		// A host that gates tracking on `marketing` alone is finished when that one is
		// refused, whatever the subject left switched on elsewhere.
		expect(
			mayAskPlatformAgain(['marketing'], {
				functionality: 'granted',
				marketing: 'denied',
				measurement: 'granted',
			})
		).toBe(false);

		expect(
			mayAskPlatformAgain(['marketing', 'measurement'], {
				functionality: 'granted',
				marketing: 'denied',
				measurement: 'granted',
			})
		).toBe(true);
	});

	test('answers no for an empty list rather than falling through to yes', () => {
		// `some` over nothing is false, and false is the direction that does not open a
		// prompt nobody asked for.
		expect(mayAskPlatformAgain([], { marketing: 'granted' })).toBe(false);
	});

	test('answers no when a category is missing from the decisions entirely', () => {
		expect(mayAskPlatformAgain(['marketing'], {})).toBe(false);
	});
});

describe('isAdditionalInformationPause', () => {
	const pause: TrackingRequestPayload = {
		presentation: 'expanded',
		stage: 'additional-information',
		status: 'not-determined',
	};

	test('names Apple pause', () => {
		expect(isAdditionalInformationPause(pause)).toBe(true);
	});

	test('names a settled answer no', () => {
		expect(
			isAdditionalInformationPause({
				presentation: 'expanded',
				stage: 'final',
				status: 'authorized',
			})
		).toBe(false);
	});

	test('names a request from a binary that never sent a stage no', () => {
		expect(
			isAdditionalInformationPause({ stage: 'final', status: 'not-determined' })
		).toBe(false);
	});
});

describe('the defaults', () => {
	test('never offer `necessary` as a tracking category', () => {
		// `necessary` is not a tracking behaviour, so treating it as one would make every
		// install look like it still owed Apple an answer.
		expect(
			(DEFAULT_TRACKING_CATEGORIES as readonly string[]).includes('necessary')
		).toBe(false);
	});

	test('cap the loop above any real number of taps and below a hot spin', () => {
		expect(MAX_TRACKING_REQUEST_TURNS).toBeGreaterThan(1);
		expect(MAX_TRACKING_REQUEST_TURNS).toBeLessThan(20);
	});
});
