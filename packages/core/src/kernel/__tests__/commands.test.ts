import { describe, expect, test } from 'vitest';

import { resolveSavePatch } from '../commands';
import { buildInitialSnapshot } from '../snapshot';

describe('resolveSavePatch', () => {
	const subjectId = 'sub_test';

	test.each(['all', 'none'] as const)(
		'%s changes only policy categories',
		(input) => {
			const snapshot = {
				...buildInitialSnapshot({
					initialConsents: {
						experience: true,
						functionality: false,
						marketing: true,
					},
				}),
				policyCategories: ['necessary', 'measurement'] as const,
			};
			const { patch, consentAction } = resolveSavePatch(
				snapshot,
				subjectId,
				input
			);
			expect(patch.consents).toEqual({
				...snapshot.consents,
				measurement: input === 'all',
				necessary: true,
			});
			expect(consentAction).toBe(input === 'all' ? 'all' : 'necessary');
		}
	);

	test.each(['all', 'none'] as const)(
		'%s respects an explicit displayed scope',
		(input) => {
			const snapshot = buildInitialSnapshot({
				initialConsents: { experience: true, marketing: true },
			});
			const { patch, consentAction } = resolveSavePatch(
				snapshot,
				subjectId,
				input,
				{
					categories: ['measurement'],
				}
			);
			expect(consentAction).toBe('custom');
			expect(patch.consents).toEqual({
				...snapshot.consents,
				measurement: input === 'all',
			});
		}
	);

	test.each(['all', 'none'] as const)(
		'%s does not treat an empty displayed scope as all categories',
		(input) => {
			const snapshot = buildInitialSnapshot({
				initialConsents: { experience: true },
			});
			const { patch } = resolveSavePatch(snapshot, subjectId, input, {
				categories: [],
			});
			expect(patch.consents).toEqual(snapshot.consents);
		}
	);

	test("'all' grants every category", () => {
		const snap = buildInitialSnapshot({});
		const { patch, consentAction } = resolveSavePatch(snap, subjectId, 'all');
		expect(consentAction).toBe('all');
		expect(patch.consents).toMatchObject({
			experience: true,
			functionality: true,
			marketing: true,
			measurement: true,
			necessary: true,
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
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
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
		expect(patch.consents).toEqual(snap.consents);
		expect(patch.consents).not.toBe(snap.consents);
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

	test('object input with no change and snapshot already finalized still refreshes consents', () => {
		// hasConsented=true, activeUI='none', subjectId already set, no
		// category change → explicit save still advances for persistence.
		const baseline = buildInitialSnapshot({});
		// Manually construct a finalized snapshot via two patches.
		const finalized = {
			...baseline,
			activeUI: 'none' as const,
			hasConsented: true,
			subjectId,
		};
		// oxlint-disable-next-line typescript/no-explicit-any -- hand-rolled finalized fixture
		const { patch } = resolveSavePatch(finalized as any, subjectId, {
			necessary: true,
		});
		expect(patch.consents).toEqual(finalized.consents);
		expect(patch.consents).not.toBe(finalized.consents);
		expect(patch.hasConsented).toBe(true);
		expect(patch.activeUI).toBe('none');
		expect(patch.subjectId).toBe(subjectId);
	});
});
