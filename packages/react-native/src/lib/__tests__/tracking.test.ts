/**
 * The invariant `native/CONTRACT.md` states in prose, written as a table.
 *
 * "No platform authorization moves a category from DENIED or PENDING to GRANTED.
 * A device with ATT granted and consent denied is denied." Every row below is
 * that sentence read one way or the other, and the test is the whole matrix
 * rather than the interesting cells: an arm nobody listed is an arm where the
 * rule can be inverted without anything noticing.
 *
 * The combinator takes both answers as arguments, so this needs no bridge, no
 * snapshot, and no device, which is also why the same expectation table can be
 * read against the Swift mapping and the Kotlin answer.
 */

import { describe, expect, test } from 'vitest';

import type { TrackingAuthorization } from '../../protocol';
import { TRACKING_AUTHORIZATION_STATUSES } from '../../protocol';
import type { ConsentDecision } from '../selectors';
import { isPlatformTrackingSatisfied, isTrackingPermitted } from '../tracking';

/** Every arm, plus a value no native core may send. */
const ALL_ARMS: readonly TrackingAuthorization[] = [
	...TRACKING_AUTHORIZATION_STATUSES,
];

/** The arms that hold tracking off, because the platform has not said yes. */
const BLOCKING_ARMS: readonly TrackingAuthorization[] = [
	'denied',
	'not-determined',
	'restricted',
];

/** The arms that add no platform bar, so consent decides alone. */
const PERMISSIVE_ARMS: readonly TrackingAuthorization[] = [
	'authorized',
	'unsupported',
];

const DECISIONS: readonly ConsentDecision[] = ['granted', 'denied', 'pending'];

describe('isPlatformTrackingSatisfied', () => {
	test.each(ALL_ARMS)(
		'reports %s without reading anything but the arm',
		(arm) => {
			expect(isPlatformTrackingSatisfied(arm)).toBe(
				PERMISSIVE_ARMS.includes(arm)
			);
		}
	);

	test('does not read `unsupported` as `not-determined`', () => {
		// The two arms are opposite instructions: one says the platform asks nothing
		// of this build, the other says the subject has not been asked yet. If they
		// ever answer the same way, either Android loses its analytics or an iOS
		// build with no prompt string starts tracking.
		expect(isPlatformTrackingSatisfied('unsupported')).not.toBe(
			isPlatformTrackingSatisfied('not-determined')
		);
	});
});

describe('isTrackingPermitted', () => {
	test('grants only when consent is granted and the platform is satisfied', () => {
		for (const decision of DECISIONS) {
			for (const arm of ALL_ARMS) {
				expect(isTrackingPermitted(decision, arm)).toBe(
					decision === 'granted' && isPlatformTrackingSatisfied(arm)
				);
			}
		}
	});

	test.each(BLOCKING_ARMS)('holds a granted category off on `%s`', (arm) => {
		// Consent decided, the platform did not say yes. The subject's answer is
		// the reason a host would like to ignore this, and the reason it cannot.
		expect(isTrackingPermitted('granted', arm)).toBe(false);
	});

	test.each(ALL_ARMS)(
		'never turns a denied category into permission on `%s`',
		(arm) => {
			// The named case from the contract: ATT granted and consent denied is
			// denied.
			expect(isTrackingPermitted('denied', arm)).toBe(false);
		}
	);

	test.each(ALL_ARMS)('never resolves a pending category on `%s`', (arm) => {
		// Pending is a wait, and an OS prompt is not the event that ends it. A
		// host must keep listening rather than read this as a refusal.
		expect(isTrackingPermitted('pending', arm)).toBe(false);
	});

	test('reads authorized plus granted as the only pair that both allow', () => {
		// Written out as the one true cell so a widened table cannot quietly move it.
		const truthTable = DECISIONS.map((decision) =>
			ALL_ARMS.map((arm) => isTrackingPermitted(decision, arm))
		);

		expect(truthTable.flat().filter(Boolean)).toHaveLength(2);
		expect(truthTable[0]?.[0]).toBe(true);
	});
});
