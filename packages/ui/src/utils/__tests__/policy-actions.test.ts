import { normalizePolicyRule } from '@c15t/core';
import { describe, expect, test } from 'vitest';

import { resolveConsentPresentation } from '../policy-actions';

const policy = normalizePolicyRule({
	id: 'presentation-test',
	match: { isDefault: true },
	model: 'opt-in',
	prompt: 'choice',
});

describe('resolveConsentPresentation', () => {
	test('supplies required controls with no host layout', () => {
		const result = resolveConsentPresentation({ policy, surface: 'prompt' });
		expect(result.orderedActions).toEqual(['accept', 'customize', 'reject']);
		expect(result.requiredActions).toEqual(['accept', 'reject']);
	});
	test('deduplicates host groups and retains their order', () => {
		const result = resolveConsentPresentation({
			policy,
			presentation: {
				prompt: { layout: ['customize', ['reject', 'accept'], 'accept'] },
			},
			surface: 'prompt',
		});
		expect(result.actionGroups).toEqual([['customize'], ['reject', 'accept']]);
		expect(result.orderedActions).toEqual(['customize', 'reject', 'accept']);
	});
	test('restores missing required actions in an empty layout', () => {
		const result = resolveConsentPresentation({
			policy,
			presentation: { prompt: { layout: [] } },
			surface: 'prompt',
		});
		expect(result.orderedActions).toEqual(['accept', 'reject']);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: 'required-action-restored' })
		);
	});
	test('excludes save from the prompt and reports the forbidden action', () => {
		const result = resolveConsentPresentation({
			policy,
			presentation: { prompt: { layout: ['save', 'accept', 'reject'] } },
			surface: 'prompt',
		});
		expect(result.orderedActions).toEqual(['accept', 'reject']);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ actions: ['save'], code: 'forbidden-action' })
		);
	});
	test('keeps save available in persistent preferences', () => {
		const result = resolveConsentPresentation({
			policy,
			presentation: { preferences: { layout: ['save', ['reject', 'accept']] } },
			surface: 'preferences',
		});
		expect(result.orderedActions).toEqual(['save', 'reject', 'accept']);
		expect(result.rights).toEqual(
			expect.arrayContaining(['disclosure', 'preferences'])
		);
	});
	test('reports unequal prominence for equivalent choice actions', () => {
		const result = resolveConsentPresentation({
			policy,
			presentation: { prompt: { primaryActions: ['accept'] } },
			surface: 'prompt',
		});
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: 'equivalent-prominence-overridden' })
		);
	});
	test.each(['row', 'column'] as const)(
		'retains host direction %s',
		(direction) => {
			expect(
				resolveConsentPresentation({
					policy,
					presentation: { preferences: { direction } },
					surface: 'preferences',
				}).direction
			).toBe(direction);
		}
	);
	test('notices cannot trap focus or lock scrolling', () => {
		const notice = normalizePolicyRule({
			id: 'notice',
			match: { isDefault: true },
			model: 'opt-out',
			prompt: 'notice',
		});
		const result = resolveConsentPresentation({
			policy: notice,
			presentation: { prompt: { scrollLock: true, trapFocus: true } },
			surface: 'prompt',
		});
		expect(result.allowedActions).toEqual(['dismiss']);
		expect(result.scrollLock).toBe(false);
		expect(result.trapFocus).toBe(false);
	});
});
