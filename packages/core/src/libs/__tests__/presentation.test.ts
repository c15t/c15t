import { normalizePolicyRule } from '@c15t/schema/types';
import { describe, expect, it } from 'vitest';

import { resolveConsentPresentation } from '../policy-actions';

const choice = normalizePolicyRule({
	id: 'choice',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
});
const notice = normalizePolicyRule({
	id: 'notice',
	match: { fallback: true },
	model: 'opt-out',
	prompt: 'notice',
});

describe('host presentation', () => {
	it('keeps required accept and reject at equal default prominence', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			surface: 'prompt',
		});
		expect(result.primaryActions).toEqual(['accept', 'reject']);
		expect(result.equivalentActions).toEqual([['accept', 'reject']]);
		expect(result.diagnostics).toEqual([]);
	});
	it('restores required actions and removes forbidden actions', () => {
		const result = resolveConsentPresentation({
			override: { layout: ['customize', 'dismiss'] },
			policy: choice,
			surface: 'prompt',
		});
		expect(result.orderedActions).toEqual(['customize', 'accept', 'reject']);
		expect(result.diagnostics.map((issue) => issue.code)).toEqual([
			'forbidden-action',
			'required-action-restored',
		]);
	});
	it('uses local overrides before host presentation and diagnoses unequal prominence', () => {
		const result = resolveConsentPresentation({
			override: { direction: 'row', primaryActions: ['accept'] },
			policy: choice,
			presentation: {
				prompt: { direction: 'column', primaryActions: ['accept', 'reject'] },
			},
			surface: 'prompt',
		});
		expect(result.direction).toBe('row');
		expect(result.diagnostics[0]?.code).toBe(
			'equivalent-prominence-overridden'
		);
	});
	it('notice has only dedicated dismissal and stays nonblocking', () => {
		const result = resolveConsentPresentation({
			override: { layout: ['accept'], scrollLock: true, trapFocus: true },
			policy: notice,
			surface: 'prompt',
		});
		expect(result.orderedActions).toEqual(['dismiss']);
		expect(result.scrollLock).toBe(false);
		expect(result.trapFocus).toBe(false);
	});
	it('notice preferences retain choice commands and persistent rights', () => {
		const result = resolveConsentPresentation({
			policy: notice,
			surface: 'preferences',
		});
		expect(result.orderedActions).toEqual(['reject', 'accept', 'save']);
		expect(result.rights).toContain('preferences');
		expect(result.rights).toContain('opt-out');
	});
});
