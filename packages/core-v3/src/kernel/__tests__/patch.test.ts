import { describe, expect, test } from 'vitest';
import { applyPatch } from '../patch';
import { buildInitialSnapshot } from '../snapshot';

describe('advance', () => {
	test('increments revision by exactly 1', () => {
		const initial = buildInitialSnapshot({});
		const next = applyPatch(initial, { hasConsented: true });
		expect(next.revision).toBe(1);
		const after = applyPatch(next, { hasConsented: false });
		expect(after.revision).toBe(2);
	});

	test('returns a frozen snapshot', () => {
		const initial = buildInitialSnapshot({});
		const next = applyPatch(initial, { hasConsented: true });
		expect(Object.isFrozen(next)).toBe(true);
	});

	test('does not mutate the input', () => {
		const initial = buildInitialSnapshot({});
		const before = initial.revision;
		applyPatch(initial, { hasConsented: true });
		expect(initial.revision).toBe(before);
	});

	test('undefined fields preserve current value', () => {
		const initial = buildInitialSnapshot({
			initialUser: { externalId: 'u1' },
			initialSubjectId: 'sub_1',
		});
		const next = applyPatch(initial, { hasConsented: true });
		expect(next.user).toBe(initial.user);
		expect(next.subjectId).toBe(initial.subjectId);
	});

	test('null fields explicitly clear nullable values', () => {
		const initial = buildInitialSnapshot({
			initialUser: { externalId: 'u1' },
			initialSubjectId: 'sub_1',
		});
		const next = applyPatch(initial, { user: null, subjectId: null });
		expect(next.user).toBeNull();
		expect(next.subjectId).toBeNull();
	});

	test('replaces concrete fields when patched', () => {
		const initial = buildInitialSnapshot({});
		const next = applyPatch(initial, {
			consents: {
				necessary: true,
				functionality: true,
				marketing: true,
				measurement: true,
				experience: true,
			},
		});
		expect(next.consents.marketing).toBe(true);
		expect(next.consents.experience).toBe(true);
	});

	test('preserves consents reference when not patched', () => {
		// Structural sharing: subscribers can `===` on `consents` to skip
		// re-deriving downstream state when only metadata changed.
		const initial = buildInitialSnapshot({});
		const next = applyPatch(initial, { hasConsented: true });
		expect(next.consents).toBe(initial.consents);
	});
});
