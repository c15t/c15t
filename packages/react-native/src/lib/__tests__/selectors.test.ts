/**
 * The pure reads. These are the only functions in the package that decide
 * anything about a permission, and every decision here is a denial.
 */

import { describe, expect, test } from 'vitest';

import { buildSnapshot } from '../../__tests__/helpers/fake-native';
import type { ConsentSnapshot } from '../../protocol';
import {
	INVALID_NATIVE_SNAPSHOT_CODE,
	denyAllSnapshot,
} from '../deny-all-snapshot';
import {
	categoryDecision,
	isCategoryAllowed,
	isConsentStatusEqual,
	isSnapshotReady,
	isPromptOwed,
	isStatusPromptOwed,
	selectConsentStatus,
	shallowEqual,
} from '../selectors';

describe('isCategoryAllowed', () => {
	test('always allows necessary', () => {
		expect(isCategoryAllowed(denyAllSnapshot('test'), 'necessary')).toBe(true);
	});

	test('denies an optional category while the core is not ready', () => {
		const snapshot = buildSnapshot({
			effectivePermissions: {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
			ready: false,
		});

		expect(isCategoryAllowed(snapshot, 'marketing')).toBe(false);
	});

	test('denies an optional category while the policy is pending', () => {
		const snapshot = buildSnapshot({ policyPending: true });

		expect(isCategoryAllowed(snapshot, 'measurement')).toBe(false);
	});

	test('takes the native evaluation verbatim once resolved', () => {
		const snapshot = buildSnapshot();

		expect(isCategoryAllowed(snapshot, 'functionality')).toBe(true);
		expect(isCategoryAllowed(snapshot, 'marketing')).toBe(false);
	});
});

describe('selectConsentStatus', () => {
	test('reads exactly the four lifecycle fields', () => {
		const snapshot = buildSnapshot({ revision: 8 });

		expect(selectConsentStatus(snapshot)).toEqual({
			activeUI: 'banner',
			policyPending: false,
			promptRequirement: { kind: 'choice', reason: 'missing' },
			ready: true,
		});
	});
});

describe('isConsentStatusEqual', () => {
	test('compares a reparsed requirement by value, not identity', () => {
		const first = selectConsentStatus(buildSnapshot({ revision: 1 }));
		const second = selectConsentStatus(buildSnapshot({ revision: 2 }));

		expect(first.promptRequirement).not.toBe(second.promptRequirement);
		expect(isConsentStatusEqual(first, second)).toBe(true);
	});

	test('notices each field a gate reads', () => {
		const base = selectConsentStatus(buildSnapshot());

		for (const next of [
			buildSnapshot({ activeUI: 'dialog' }),
			buildSnapshot({ policyPending: true }),
			buildSnapshot({ ready: false }),
			buildSnapshot({
				promptRequirement: { kind: 'notice', reason: 'acknowledge' },
			}),
		].map(selectConsentStatus)) {
			expect(isConsentStatusEqual(base, next)).toBe(false);
		}
	});

	test('treats any two settled requirements as the same shape', () => {
		const choice = selectConsentStatus(buildSnapshot());
		const none = selectConsentStatus(
			buildSnapshot({ promptRequirement: { kind: 'none' } })
		);

		expect(isConsentStatusEqual(choice, none)).toBe(false);
		expect(isConsentStatusEqual(none, none)).toBe(true);
	});
});

describe('prompt owed', () => {
	test('requires a settled snapshot with a requirement', () => {
		const snapshot: ConsentSnapshot = buildSnapshot();

		expect(isPromptOwed(snapshot)).toBe(true);
		expect(isStatusPromptOwed(selectConsentStatus(snapshot))).toBe(true);
		expect(isPromptOwed(buildSnapshot({ ready: false }))).toBe(false);
		expect(isPromptOwed(buildSnapshot({ policyPending: true }))).toBe(false);
		expect(
			isPromptOwed(buildSnapshot({ promptRequirement: { kind: 'none' } }))
		).toBe(false);
	});
});

describe('shallowEqual', () => {
	test('accepts identical and field-for-field values', () => {
		const value = { ready: true };

		expect(shallowEqual(value, value)).toBe(true);
		expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true);
	});

	test('rejects a different shape or a changed field', () => {
		expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
		expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
		expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
	});

	test('rejects non-objects that are not identical', () => {
		expect(shallowEqual(null, { a: 1 })).toBe(false);
		expect(shallowEqual(1, '1')).toBe(false);
		expect(shallowEqual(null, null)).toBe(true);
	});
});

describe('denyAllSnapshot', () => {
	test('fails every optional category closed and says why', () => {
		const snapshot = denyAllSnapshot('native went quiet', 12);

		expect(snapshot.revision).toBe(12);
		expect(snapshot.ready).toBe(false);
		expect(snapshot.policyPending).toBe(true);
		expect(snapshot.activeUI).toBe('none');
		expect(snapshot.error?.code).toBe(INVALID_NATIVE_SNAPSHOT_CODE);
		expect(snapshot.error?.message).toBe('native went quiet');
		expect(snapshot.effectivePermissions).toEqual({
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		});
		expect(isPromptOwed(snapshot)).toBe(false);
	});

	test('defaults the revision to zero', () => {
		expect(denyAllSnapshot('nothing stored').revision).toBe(0);
	});
});

const ALL_CATEGORIES = [
	'experience',
	'functionality',
	'marketing',
	'measurement',
	'necessary',
] as const;

describe('categoryDecision', () => {
	test('grants necessary before the core has been told anything', () => {
		expect(categoryDecision(denyAllSnapshot('test'), 'necessary')).toBe(
			'granted'
		);
	});

	test('reports pending, not denied, while the core is not ready', () => {
		// The distinction the type exists for: `false` in an unresolved snapshot is
		// not a refusal, and a host that reads it as one stops listening for a
		// category that is about to be granted.
		const snapshot = buildSnapshot({
			effectivePermissions: {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
			ready: false,
		});

		expect(categoryDecision(snapshot, 'marketing')).toBe('pending');
	});

	test('reports pending while the first policy resolution is outstanding', () => {
		const snapshot = buildSnapshot({
			effectivePermissions: {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
			policyPending: true,
		});

		expect(categoryDecision(snapshot, 'measurement')).toBe('pending');
	});

	test('separates a grant from a refusal once resolved', () => {
		const snapshot = buildSnapshot();

		expect(categoryDecision(snapshot, 'functionality')).toBe('granted');
		expect(categoryDecision(snapshot, 'marketing')).toBe('denied');
	});

	test('agrees with the boolean for every category and lifecycle state', () => {
		const lifecycles = [
			{},
			{ policyPending: true },
			{ ready: false },
			{ policyPending: true, ready: false },
		];

		for (const lifecycle of lifecycles) {
			const snapshot = buildSnapshot(lifecycle);

			for (const category of ALL_CATEGORIES) {
				expect(categoryDecision(snapshot, category) === 'granted').toBe(
					isCategoryAllowed(snapshot, category)
				);
			}
		}
	});
});

describe('isSnapshotReady', () => {
	test('needs hydration and a resolved policy', () => {
		expect(isSnapshotReady(buildSnapshot())).toBe(true);
		expect(isSnapshotReady(buildSnapshot({ ready: false }))).toBe(false);
		expect(isSnapshotReady(buildSnapshot({ policyPending: true }))).toBe(false);
	});

	test('is false for the cold-start snapshot', () => {
		// The snapshot a fresh install with nothing stored answers with, and the one
		// an unreadable bridge payload falls back to.
		expect(isSnapshotReady(denyAllSnapshot('test'))).toBe(false);
	});
});
