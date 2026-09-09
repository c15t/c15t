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
		expect(result.primaryActions).toEqual(['customize']);
		expect(result.equivalentActions).toEqual([['accept', 'reject']]);
		expect(result.diagnostics).toEqual([]);
	});
	it('defaults to reject and accept together, then customize, on one compact row', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			surface: 'prompt',
		});
		expect(result.actionGroups).toEqual([['reject', 'accept'], ['customize']]);
		expect(result.primaryActions).toEqual(['customize']);
		expect(result.direction).toBe('row');
		expect(result.uiProfile).toBe('compact');
		expect(result.shouldFillActions).toBe(false);
	});
	it('defaults preferences to reject and accept together, then save', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			surface: 'preferences',
		});
		expect(result.actionGroups).toEqual([['reject', 'accept'], ['save']]);
		expect(result.primaryActions).toEqual(['save']);
	});
	it('leaves no default primary when the rule omits customize', () => {
		const result = resolveConsentPresentation({
			policy: normalizePolicyRule({
				actions: ['accept', 'reject'],
				id: 'two-actions',
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
			}),
			surface: 'prompt',
		});
		expect(result.actionGroups).toEqual([['reject', 'accept']]);
		expect(result.primaryActions).toEqual([]);
		expect(result.diagnostics).toEqual([]);
	});
	it('defaults a notice prompt to its single dismiss action', () => {
		const result = resolveConsentPresentation({
			policy: notice,
			surface: 'prompt',
		});
		expect(result.actionGroups).toEqual([['dismiss']]);
	});
	it('keeps an explicit balanced profile filling and stacking', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			presentation: { prompt: { uiProfile: 'balanced' } },
			surface: 'prompt',
		});
		expect(result.shouldFillActions).toBe(true);
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
	describe('additional preferences controls', () => {
		it('lists only opt-out on a notice, since that control opens preferences', () => {
			const result = resolveConsentPresentation({
				policy: notice,
				surface: 'prompt',
			});
			expect(result.rights).toContain('disclosure');
			expect(result.rights).toContain('preferences');
			expect(result.preferenceControls).toEqual(['opt-out']);
		});
		it('covers preferences with customize on a choice prompt', () => {
			const result = resolveConsentPresentation({
				policy: choice,
				surface: 'prompt',
			});
			expect(result.preferenceControls).toEqual([]);
		});
		it('leaves preferences uncovered when the rule omits customize', () => {
			const result = resolveConsentPresentation({
				policy: normalizePolicyRule({
					actions: ['accept', 'reject'],
					id: 'two-actions',
					match: { fallback: true },
					model: 'opt-in',
					prompt: 'choice',
				}),
				surface: 'prompt',
			});
			expect(result.preferenceControls).toEqual(['preferences']);
		});
		it('covers opt-out with reject on an opt-out choice prompt', () => {
			const result = resolveConsentPresentation({
				policy: normalizePolicyRule({
					actions: ['accept', 'reject'],
					id: 'opt-out-choice',
					match: { fallback: true },
					model: 'opt-out',
					prompt: 'choice',
				}),
				surface: 'prompt',
			});
			expect(result.rights).toContain('opt-out');
			expect(result.preferenceControls).toEqual(['preferences']);
		});
		it('covers every right on the preferences surface', () => {
			const result = resolveConsentPresentation({
				policy: notice,
				surface: 'preferences',
			});
			expect(result.preferenceControls).toEqual([]);
		});
	});
});

describe('surface shape', () => {
	it.each([undefined, false, true])(
		'never blocks a notice wall with blocking=%s',
		(blocking) => {
			const result = resolveConsentPresentation({
				override: { blocking, variant: 'wall' },
				policy: notice,
				surface: 'prompt',
			});
			expect(result.variant).toBe('floating');
			expect(result.blocking).toBe(false);
			expect(result.trapFocus).toBe(false);
			expect(result.scrollLock).toBe(false);
			expect(result.diagnostics).toContainEqual(
				expect.objectContaining({ code: 'invalid-variant' })
			);
		}
	);
	it.each(['prompt', 'preferences'] as const)(
		'explicit non-blocking overrides legacy controls on %s',
		(surface) => {
			const result = resolveConsentPresentation({
				override: { blocking: false, scrollLock: true, trapFocus: true },
				policy: choice,
				surface,
			});
			expect(result.blocking).toBe(false);
			expect(result.trapFocus).toBe(false);
			expect(result.scrollLock).toBe(false);
		}
	);
	it('rejects unsupported preference geometry at the runtime boundary', () => {
		const result = resolveConsentPresentation({
			override: { position: 'top', variant: 'bar' },
			policy: choice,
			surface: 'preferences',
		});
		expect(result.variant).toBe('wall');
		expect(result.position).toBe('center');
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: 'invalid-variant' })
		);
	});
	it('defaults a choice prompt to a floating card at bottom-left', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			surface: 'prompt',
		});
		expect(result.variant).toBe('floating');
		expect(result.position).toBe('bottom-left');
		expect(result.positionSource).toBe('default');
		expect(result.blocking).toBe(false);
		expect(result.trapFocus).toBe(false);
		expect(result.scrollLock).toBe(false);
	});
	it('defaults a notice prompt to a floating card that is never blocking', () => {
		const result = resolveConsentPresentation({
			policy: notice,
			presentation: { prompt: { blocking: true } },
			surface: 'prompt',
		});
		expect(result.variant).toBe('floating');
		expect(result.position).toBe('bottom-left');
		expect(result.positionSource).toBe('default');
		expect(result.blocking).toBe(false);
		expect(result.trapFocus).toBe(false);
		expect(result.scrollLock).toBe(false);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
			'blocking-forbidden',
		]);
	});
	it('renders a notice as a bottom bar when the host asks for one', () => {
		const result = resolveConsentPresentation({
			policy: notice,
			presentation: { prompt: { variant: 'bar' } },
			surface: 'prompt',
		});
		expect(result.variant).toBe('bar');
		expect(result.position).toBe('bottom');
		expect(result.positionSource).toBe('default');
		expect(result.blocking).toBe(false);
		expect(result.diagnostics).toEqual([]);
	});
	it('forces a wall to block and to trap focus and lock scroll', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			presentation: {
				prompt: {
					blocking: false,
					scrollLock: false,
					trapFocus: false,
					variant: 'wall',
				},
			},
			surface: 'prompt',
		});
		expect(result.blocking).toBe(true);
		expect(result.position).toBe('center');
		expect(result.trapFocus).toBe(true);
		expect(result.scrollLock).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
			'blocking-required',
		]);
	});
	it('blocking forces trap focus and scroll lock on a floating card', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			presentation: { prompt: { blocking: true, trapFocus: false } },
			surface: 'prompt',
		});
		expect(result.blocking).toBe(true);
		expect(result.trapFocus).toBe(true);
		expect(result.scrollLock).toBe(true);
		expect(result.diagnostics).toEqual([]);
	});
	it('falls back to the variant default when the position does not fit', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			presentation: { prompt: { position: 'top', variant: 'floating' } },
			surface: 'prompt',
		});
		expect(result.position).toBe('bottom-left');
		expect(result.positionSource).toBe('default');
		expect(result.diagnostics).toEqual([
			{
				actions: [],
				code: 'invalid-position',
				message:
					'Position "top" is not valid for the floating variant; using "bottom-left".',
			},
		]);
	});
	it('marks a valid host position as host-sourced', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			presentation: { prompt: { position: 'top-center' } },
			surface: 'prompt',
		});
		expect(result.position).toBe('top-center');
		expect(result.positionSource).toBe('host');
	});
	it('accepts every widget corner and rejects edge centers', () => {
		for (const position of [
			'bottom-left',
			'bottom-right',
			'top-left',
			'top-right',
		] as const) {
			const result = resolveConsentPresentation({
				policy: notice,
				presentation: { prompt: { position, variant: 'widget' } },
				surface: 'prompt',
			});
			expect(result.position).toBe(position);
			expect(result.positionSource).toBe('host');
		}
		const centered = resolveConsentPresentation({
			policy: notice,
			presentation: {
				prompt: { position: 'bottom-center', variant: 'widget' },
			},
			surface: 'prompt',
		});
		expect(centered.position).toBe('bottom-right');
		expect(centered.diagnostics[0]?.code).toBe('invalid-position');
	});
	it('defaults the preferences surface to a centered blocking wall', () => {
		const result = resolveConsentPresentation({
			policy: notice,
			surface: 'preferences',
		});
		expect(result.variant).toBe('wall');
		expect(result.position).toBe('center');
		expect(result.positionSource).toBe('default');
		expect(result.blocking).toBe(true);
		expect(result.trapFocus).toBe(true);
		expect(result.scrollLock).toBe(true);
		expect(result.diagnostics).toEqual([]);
	});
	it('keeps the preferences dialog non-blocking when the host turns off scroll lock', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			presentation: { preferences: { scrollLock: false } },
			surface: 'preferences',
		});
		expect(result.variant).toBe('wall');
		expect(result.blocking).toBe(false);
		expect(result.scrollLock).toBe(false);
		expect(result.trapFocus).toBe(false);
		expect(result.diagnostics).toEqual([]);
	});
	it('keeps the preferences dialog non-blocking when the host turns off the focus trap', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			presentation: { preferences: { trapFocus: false } },
			surface: 'preferences',
		});
		expect(result.blocking).toBe(false);
		expect(result.trapFocus).toBe(false);
		expect(result.scrollLock).toBe(false);
		expect(result.diagnostics).toEqual([]);
	});
	it('honors an explicit non-blocking preferences dialog without a diagnostic', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			presentation: { preferences: { blocking: false } },
			surface: 'preferences',
		});
		expect(result.variant).toBe('wall');
		expect(result.blocking).toBe(false);
		expect(result.diagnostics).toEqual([]);
	});
	it('lets explicit blocking on the preferences surface force scroll lock back on', () => {
		const result = resolveConsentPresentation({
			policy: choice,
			presentation: { preferences: { blocking: true, scrollLock: false } },
			surface: 'preferences',
		});
		expect(result.blocking).toBe(true);
		expect(result.scrollLock).toBe(true);
		expect(result.trapFocus).toBe(true);
	});
	it('lets a local override beat host presentation for shape fields', () => {
		const result = resolveConsentPresentation({
			override: { position: 'top', variant: 'bar' },
			policy: choice,
			presentation: {
				prompt: { blocking: true, position: 'top-right', variant: 'floating' },
			},
			surface: 'prompt',
		});
		expect(result.variant).toBe('bar');
		expect(result.position).toBe('top');
		expect(result.positionSource).toBe('host');
		expect(result.blocking).toBe(true);
		expect(result.diagnostics).toEqual([]);
	});
});

it('uses generic preference copy for a non-US opt-out message profile', () => {
	const policy = normalizePolicyRule({
		i18n: { messageProfile: 'preferences' },
		id: 'canada',
		match: { countries: ['CA'] },
		model: 'opt-out',
		prompt: 'notice',
	});
	const presentation = resolveConsentPresentation({
		policy,
		surface: 'prompt',
	});
	expect(presentation.preferenceControls).toEqual(['preferences']);
	expect(presentation.rights).toContain('opt-out');
	expect(presentation.orderedActions).toEqual(['dismiss']);
});

it.each([{ scrollLock: true }, { trapFocus: true }])(
	'maps a legacy prompt option %j to full blocking',
	(prompt) => {
		const result = resolveConsentPresentation({
			policy: choice,
			presentation: { prompt },
			surface: 'prompt',
		});
		expect(result.blocking).toBe(true);
		expect(result.scrollLock).toBe(true);
		expect(result.trapFocus).toBe(true);
	}
);
