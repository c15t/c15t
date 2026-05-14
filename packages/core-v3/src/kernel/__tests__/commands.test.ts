import { describe, expect, test } from 'vitest';
import { resolveSavePatch } from '../commands';
import { buildInitialSnapshot } from '../snapshot';

describe('resolveSavePatch', () => {
	const subjectId = 'sub_test';

	test("'all' grants every category", () => {
		const snap = buildInitialSnapshot({});
		const { patch, consentAction } = resolveSavePatch(snap, subjectId, 'all');
		expect(consentAction).toBe('all');
		expect(patch.consents).toMatchObject({
			necessary: true,
			functionality: true,
			marketing: true,
			measurement: true,
			experience: true,
		});
		expect(patch.subjectId).toBe(subjectId);
		expect(patch.hasConsented).toBe(true);
		expect(patch.activeUI).toBe('none');
	});

	test("'none' leaves only necessary granted", () => {
		const snap = buildInitialSnapshot({
			initialConsents: { marketing: true, measurement: true },
		});
		const { patch, consentAction } = resolveSavePatch(snap, subjectId, 'none');
		expect(consentAction).toBe('necessary');
		expect(patch.consents).toMatchObject({
			necessary: true,
			functionality: false,
			marketing: false,
			measurement: false,
			experience: false,
		});
	});

	test('object input with at least one change emits a full patch', () => {
		const snap = buildInitialSnapshot({});
		const { patch, consentAction } = resolveSavePatch(snap, subjectId, {
			marketing: true,
		});
		expect(consentAction).toBe('custom');
		expect(patch.consents?.marketing).toBe(true);
		expect(patch.hasConsented).toBe(true);
		expect(patch.activeUI).toBe('none');
	});

	test('object input with no actual change finalizes metadata', () => {
		const snap = buildInitialSnapshot({});
		const { patch, consentAction } = resolveSavePatch(snap, subjectId, {
			necessary: true,
		});
		expect(consentAction).toBe('custom');
		expect(patch.consents).toBeUndefined();
		expect(patch.hasConsented).toBe(true);
		expect(patch.activeUI).toBe('none');
		expect(patch.subjectId).toBe(subjectId);
	});

	test('undefined input finalizes the current consents in place', () => {
		const snap = buildInitialSnapshot({});
		const { patch, consentAction } = resolveSavePatch(
			snap,
			subjectId,
			undefined
		);
		expect(consentAction).toBe('custom');
		expect(patch.consents).toBeUndefined();
		expect(patch.hasConsented).toBe(true);
		expect(patch.activeUI).toBe('none');
		expect(patch.subjectId).toBe(subjectId);
	});

	test('object input with no change and snapshot already finalized returns near-empty patch', () => {
		// hasConsented=true, activeUI='none', subjectId already set, no
		// category change → only the subjectId no-op path remains.
		const baseline = buildInitialSnapshot({});
		// Manually construct a finalized snapshot via two patches.
		const finalized = {
			...baseline,
			hasConsented: true,
			activeUI: 'none' as const,
			subjectId,
		};
		// biome-ignore lint/suspicious/noExplicitAny: hand-rolled finalized fixture
		const { patch } = resolveSavePatch(finalized as any, subjectId, {
			necessary: true,
		});
		expect(patch).toEqual({});
	});
});
