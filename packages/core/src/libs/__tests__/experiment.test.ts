import { normalizePolicyRule } from '@c15t/schema/types';
import { describe, expect, it } from 'vitest';

import {
	actionAppearanceFromTheme,
	applyExperimentTheme,
	assignExperimentVariant,
	resolveExperimentPresentation,
	resolveExperimentTheme,
	validateExperiment,
} from '../experiment';
import type { ConsentExperiment } from '../experiment';

const choice = normalizePolicyRule({
	id: 'choice',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
});

const experiment: ConsentExperiment = {
	id: 'banner-shape',
	variants: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { position: 'bottom-right', variant: 'floating' } },
	},
};

describe('assignExperimentVariant', () => {
	it('uses the host variant when it names a declared arm', () => {
		expect(
			assignExperimentVariant({ ...experiment, variant: 'floating' }, 'sub_1')
		).toEqual({
			acknowledgedDiagnostics: false,
			assignedBy: 'host',
			id: 'banner-shape',
			variant: 'floating',
		});
	});
	it('throws for a host variant that is not declared', () => {
		expect(() =>
			assignExperimentVariant({ ...experiment, variant: 'wall' }, 'sub_1')
		).toThrow(/variant "wall" is not one of "bar", "floating"/u);
	});
	it('is deterministic for the same experiment and subject', () => {
		const first = assignExperimentVariant(experiment, 'sub_abc');
		expect(first.assignedBy).toBe('c15t');
		for (let index = 0; index < 20; index += 1) {
			expect(assignExperimentVariant(experiment, 'sub_abc')).toEqual(first);
		}
	});
	it('spreads subjects across arms by weight', () => {
		const weighted: ConsentExperiment = {
			...experiment,
			weights: { bar: 90, floating: 10 },
		};
		let bars = 0;
		for (let index = 0; index < 1000; index += 1) {
			if (assignExperimentVariant(weighted, `sub_${index}`).variant === 'bar') {
				bars += 1;
			}
		}
		expect(bars).toBeGreaterThan(850);
		expect(bars).toBeLessThan(950);
	});
	it('reports the acknowledgement on the assignment', () => {
		expect(
			assignExperimentVariant(
				{ ...experiment, acknowledgeDiagnostics: true },
				'sub_1'
			).acknowledgedDiagnostics
		).toBe(true);
	});
});

describe('assignExperimentVariant weights', () => {
	it('rejects a supplied map that reaches no arm', () => {
		const unusable: Readonly<Record<string, number>>[] = [
			{ bar: 0, floating: 0 },
			{ bar: Number.POSITIVE_INFINITY, floating: 1 },
			{ bar: Number.NaN },
		];
		for (const weights of unusable) {
			expect(() =>
				assignExperimentVariant({ ...experiment, weights }, 'sub_1')
			).toThrow(/finite positive weight/u);
		}
	});

	it('gives an arm missing from the map weight 0, prototype keys included', () => {
		const only: ConsentExperiment = {
			...experiment,
			variants: { ...experiment.variants, constructor: {} },
			weights: { bar: 1 },
		};
		for (let index = 0; index < 50; index += 1) {
			expect(assignExperimentVariant(only, `sub_${index}`).variant).toBe('bar');
		}
	});
});

describe('resolveExperimentPresentation', () => {
	it('merges the arm over the base per surface, arm wins', () => {
		const resolved = resolveExperimentPresentation(
			{
				preferences: { blocking: false, defaults: { marketing: true } },
				prompt: { position: 'top-left', uiProfile: 'strict', variant: 'wall' },
			},
			{
				...experiment,
				variants: {
					...experiment.variants,
					floating: {
						preferences: { defaults: { measurement: false } },
						prompt: { position: 'bottom-right', variant: 'floating' },
					},
				},
			},
			{ variant: 'floating' }
		);
		expect(resolved).toEqual({
			preferences: {
				blocking: false,
				defaults: { marketing: true, measurement: false },
			},
			prompt: {
				position: 'bottom-right',
				uiProfile: 'strict',
				variant: 'floating',
			},
		});
	});
	it('returns the base for an arm that no longer exists', () => {
		const base = { prompt: { variant: 'bar' as const } };
		expect(
			resolveExperimentPresentation(base, experiment, { variant: 'gone' })
		).toBe(base);
	});
});

describe('validateExperiment', () => {
	const uneven: ConsentExperiment = {
		id: 'prominence',
		variants: {
			control: {},
			loud: { prompt: { primaryActions: ['accept'] } },
		},
	};
	it('returns no diagnostics for clean arms', () => {
		expect(validateExperiment(experiment, choice)).toEqual({});
	});
	it('throws for an arm with diagnostics unless acknowledged', () => {
		expect(() => validateExperiment(uneven, choice)).toThrow(
			/"loud": equivalent-prominence-overridden/u
		);
	});
	it('returns the diagnostics per arm when acknowledged', () => {
		const diagnostics = validateExperiment(
			{ ...uneven, acknowledgeDiagnostics: true },
			choice
		);
		expect(Object.keys(diagnostics)).toEqual(['loud']);
		expect(diagnostics.loud?.map((entry) => entry.code)).toEqual([
			'equivalent-prominence-overridden',
		]);
	});
	it('validates the arm merged over the base presentation', () => {
		expect(() =>
			validateExperiment(experiment, choice, {
				presentation: { prompt: { primaryActions: ['accept'] } },
			})
		).toThrow(/"bar".*\n.*"floating"|"bar"/u);
	});
	it('rejects an unusable weights map when c15t would assign the arm', () => {
		const zero = { ...experiment, weights: { bar: 0, floating: 0 } };
		expect(() => validateExperiment(zero, choice)).toThrow(
			/finite positive weight/u
		);
		// A host-resolved arm never reads the weights.
		expect(validateExperiment({ ...zero, variant: 'bar' }, choice)).toEqual({});
	});
});

describe('resolveExperimentTheme', () => {
	const themed: ConsentExperiment = {
		id: 'button-style',
		variants: {
			bold: {
				theme: {
					colors: { primary: '#0a0a0a' },
					radius: { lg: '4px' },
					slots: { consentBanner: ['a', 'b'] },
				},
			},
			control: {},
		},
	};
	const base = {
		colors: { primary: '#2f6f4e', secondary: '#fff' },
		motion: { duration: '1s' },
		slots: { consentBanner: ['x'] },
	};
	it('merges the arm over the base one group deep, arm wins on the leaf', () => {
		expect(resolveExperimentTheme(base, themed, { variant: 'bold' })).toEqual({
			colors: { primary: '#0a0a0a', secondary: '#fff' },
			motion: { duration: '1s' },
			radius: { lg: '4px' },
			slots: { consentBanner: ['a', 'b'] },
		});
	});
	it('returns the base itself for an arm without a theme', () => {
		expect(resolveExperimentTheme(base, themed, { variant: 'control' })).toBe(
			base
		);
		expect(resolveExperimentTheme(base, themed, { variant: 'gone' })).toBe(
			base
		);
	});
	it('returns the arm theme when there is no base', () => {
		expect(
			resolveExperimentTheme(undefined, themed, { variant: 'bold' })
		).toEqual(themed.variants.bold?.theme);
	});
	it('applies only for a matching assignment', () => {
		expect(
			applyExperimentTheme(base, themed, { id: 'other', variant: 'bold' })
		).toBe(base);
		expect(applyExperimentTheme(base, undefined, null)).toBe(base);
		expect(
			applyExperimentTheme(base, themed, {
				id: 'button-style',
				variant: 'bold',
			})?.colors
		).toEqual({ primary: '#0a0a0a', secondary: '#fff' });
	});
});

describe('actionAppearanceFromTheme', () => {
	it('spreads default under each styled action', () => {
		expect(
			actionAppearanceFromTheme({
				consentActions: {
					accept: { mode: 'filled' },
					default: { variant: 'neutral' },
				},
			})
		).toEqual({
			accept: { mode: 'filled', variant: 'neutral' },
			customize: { variant: 'neutral' },
			dismiss: { variant: 'neutral' },
			reject: { variant: 'neutral' },
		});
	});
	it('is undefined when no action is styled', () => {
		expect(actionAppearanceFromTheme(undefined)).toBeUndefined();
		expect(
			actionAppearanceFromTheme({
				consentActions: { default: { mode: 'ghost' } },
			})
		).toBeUndefined();
	});
});

describe('validateExperiment with arm themes', () => {
	const uneven: ConsentExperiment = {
		id: 'button-style',
		variants: {
			control: {},
			loud: {
				theme: {
					consentActions: {
						accept: { mode: 'filled', variant: 'primary' },
						reject: { mode: 'stroke', variant: 'neutral' },
					},
				},
			},
		},
	};
	it('trips equivalent-prominence-overridden for a theme-only arm', () => {
		expect(() => validateExperiment(uneven, choice)).toThrow(
			/"loud": equivalent-prominence-overridden/u
		);
	});
	it('passes when acknowledged and reports only the themed arm', () => {
		const diagnostics = validateExperiment(
			{ ...uneven, acknowledgeDiagnostics: true },
			choice
		);
		expect(Object.keys(diagnostics)).toEqual(['loud']);
	});
	it('merges the arm theme over the host theme before checking', () => {
		expect(() =>
			validateExperiment(
				{
					id: 'button-style',
					variants: {
						control: {},
						quiet: {
							theme: {
								consentActions: {
									reject: { mode: 'filled', variant: 'primary' },
								},
							},
						},
					},
				},
				choice,
				{
					theme: {
						consentActions: {
							accept: { mode: 'filled', variant: 'primary' },
							reject: { mode: 'stroke', variant: 'neutral' },
						},
					},
				}
			)
		).toThrow(/"control": equivalent-prominence-overridden/u);
	});
});
