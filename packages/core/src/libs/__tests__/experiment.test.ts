import { normalizePolicyRule } from '@c15t/schema/types';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { defineExperiment } from '../../index';
import type { ExperimentArmName } from '../../index';
import {
	actionAppearanceFromTheme,
	applyExperimentTheme,
	experimentConfigError,
	pickExperimentArm,
	resolveExperimentPresentation,
	resolveExperimentTheme,
	seedExperiment,
} from '../experiment';
import type { ConsentExperiment } from '../experiment';
import { validateExperiment } from '../experiment-engine';

const choice = normalizePolicyRule({
	id: 'choice',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
});

const experiment: ConsentExperiment = {
	arms: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { position: 'bottom-right', variant: 'floating' } },
	},
	id: 'banner-shape',
};

describe('ExperimentArmName', () => {
	it('is control plus the arms defineExperiment inferred', () => {
		const bannerLayout = defineExperiment({
			arms: {
				bar: { prompt: { variant: 'bar' } },
				wall: { prompt: { variant: 'wall' } },
			},
			id: 'banner-layout',
		});
		type BannerArm = ExperimentArmName<typeof bannerLayout>;

		expectTypeOf<BannerArm>().toEqualTypeOf<'control' | 'bar' | 'wall'>();
		expectTypeOf<'grid'>().not.toExtend<BannerArm>();
		// Every name is one `arm` accepts, so a typed flag value passes as is.
		expectTypeOf<BannerArm>().toExtend<
			NonNullable<(typeof bannerLayout)['arm']>
		>();
	});
});

describe('pickExperimentArm', () => {
	it('can pick control, which is always an arm', () => {
		expect(pickExperimentArm(experiment, null, 0).arm).toBe('control');
		expect(pickExperimentArm(experiment, null, 0.99).arm).toBe('floating');
	});
	it('splits by the given weights', () => {
		const sixtyForty: ConsentExperiment = {
			...experiment,
			split: { bar: 40, control: 60 },
		};
		expect(pickExperimentArm(sixtyForty, null, 0.59).arm).toBe('control');
		expect(pickExperimentArm(sixtyForty, null, 0.61).arm).toBe('bar');
	});
	it('gives an arm missing from the split no visitors, prototype keys included', () => {
		const only: ConsentExperiment = {
			...experiment,
			arms: { ...experiment.arms, constructor: {} },
			split: { bar: 1 },
		};
		for (const random of [0, 0.3, 0.6, 0.99]) {
			expect(pickExperimentArm(only, null, random).arm).toBe('bar');
		}
	});
	it('keeps the arm this browser already saw', () => {
		expect(
			pickExperimentArm(experiment, { arm: 'bar', id: 'banner-shape' }, 0)
		).toEqual({
			acknowledgedDiagnostics: false,
			arm: 'bar',
			assignedBy: 'c15t',
			id: 'banner-shape',
		});
	});
	it('picks again when the stored arm is gone or from another experiment', () => {
		expect(
			pickExperimentArm(experiment, { arm: 'wall', id: 'banner-shape' }, 0).arm
		).toBe('control');
		expect(
			pickExperimentArm(experiment, { arm: 'bar', id: 'other' }, 0).arm
		).toBe('control');
	});
});

describe('experimentConfigError', () => {
	it('accepts a valid definition', () => {
		expect(experimentConfigError(experiment)).toBeNull();
		expect(experimentConfigError({ ...experiment, arm: 'control' })).toBeNull();
	});
	it('rejects control listed in arms', () => {
		expect(
			experimentConfigError({
				...experiment,
				arms: { ...experiment.arms, control: {} },
			})
		).toMatch(/`control` is your `presentation`/u);
	});
	it('rejects an undeclared arm', () => {
		expect(experimentConfigError({ ...experiment, arm: 'wall' })).toMatch(
			/arm "wall"/u
		);
	});
	it('rejects a split with a typo or no positive weight', () => {
		expect(
			experimentConfigError({ ...experiment, split: { bar: 1, flaoting: 1 } })
		).toMatch(/"flaoting"/u);
		for (const split of [
			{ bar: 0, control: 0 },
			{ bar: Number.POSITIVE_INFINITY },
			{ bar: Number.NaN },
		]) {
			expect(experimentConfigError({ ...experiment, split })).toMatch(
				/finite positive weight/u
			);
		}
	});
});

describe('seedExperiment', () => {
	it('seeds a host arm and holds the prompt until the gate unless rendered', () => {
		const arm = {
			acknowledgedDiagnostics: false,
			arm: 'bar',
			assignedBy: 'host',
			id: 'banner-shape',
		};
		expect(seedExperiment({ ...experiment, arm: 'bar' })).toEqual({
			initialExperiment: arm,
			initialExperimentPending: true,
		});
		expect(seedExperiment({ ...experiment, arm: 'bar' }, null, true)).toEqual({
			initialExperiment: arm,
		});
	});
	it('holds the prompt for c15t to pick', () => {
		expect(seedExperiment(experiment)).toEqual({
			initialExperimentPending: true,
		});
	});
	it('runs no experiment for an invalid definition', () => {
		const { error } = console;
		console.error = () => undefined;
		try {
			expect(seedExperiment({ ...experiment, arm: 'wall' })).toEqual({});
		} finally {
			console.error = error;
		}
	});
});

describe('resolveExperimentPresentation', () => {
	it('keeps a base value the arm leaves undefined', () => {
		expect(
			resolveExperimentPresentation(
				{ prompt: { position: 'bottom-left', variant: 'floating' } },
				{
					arms: {
						bar: { prompt: { position: undefined, variant: 'bar' } },
					},
					id: 'shape',
				},
				{ arm: 'bar' }
			).prompt
		).toEqual({ position: 'bottom-left', variant: 'bar' });
	});

	it('merges the arm over the base per surface, arm wins', () => {
		const resolved = resolveExperimentPresentation(
			{
				preferences: { blocking: false, defaults: { marketing: true } },
				prompt: { position: 'top-left', uiProfile: 'strict', variant: 'wall' },
			},
			{
				...experiment,
				arms: {
					...experiment.arms,
					floating: {
						preferences: { defaults: { measurement: false } },
						prompt: { position: 'bottom-right', variant: 'floating' },
					},
				},
			},
			{ arm: 'floating' }
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
			resolveExperimentPresentation(base, experiment, { arm: 'gone' })
		).toBe(base);
	});
});

describe('validateExperiment', () => {
	const uneven: ConsentExperiment = {
		arms: {
			loud: { prompt: { primaryActions: ['accept'] } },
		},
		id: 'prominence',
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
	it('rejects an unusable split when c15t would pick the arm', () => {
		const zero = { ...experiment, split: { bar: 0, floating: 0 } };
		expect(() => validateExperiment(zero, choice)).toThrow(
			/finite positive weight/u
		);
		// A host-resolved arm never reads the split.
		expect(validateExperiment({ ...zero, arm: 'bar' }, choice)).toEqual({});
	});
});

describe('resolveExperimentTheme', () => {
	const themed: ConsentExperiment = {
		arms: {
			bold: {
				theme: {
					colors: { primary: '#0a0a0a' },
					radius: { lg: '4px' },
					slots: { consentBanner: ['a', 'b'] },
				},
			},
		},
		id: 'button-style',
	};
	const base = {
		colors: { primary: '#2f6f4e', secondary: '#fff' },
		motion: { duration: '1s' },
		slots: { consentBanner: ['x'] },
	};
	it('merges the arm over the base one group deep, arm wins on the leaf', () => {
		expect(resolveExperimentTheme(base, themed, { arm: 'bold' })).toEqual({
			colors: { primary: '#0a0a0a', secondary: '#fff' },
			motion: { duration: '1s' },
			radius: { lg: '4px' },
			slots: { consentBanner: ['a', 'b'] },
		});
	});
	it('returns the base itself for an arm without a theme', () => {
		expect(resolveExperimentTheme(base, themed, { arm: 'control' })).toBe(base);
		expect(resolveExperimentTheme(base, themed, { arm: 'gone' })).toBe(base);
	});
	it('returns the arm theme when there is no base', () => {
		expect(resolveExperimentTheme(undefined, themed, { arm: 'bold' })).toEqual(
			themed.arms.bold?.theme
		);
	});
	it('applies only for a matching assignment', () => {
		expect(
			applyExperimentTheme(base, themed, { arm: 'bold', id: 'other' })
		).toBe(base);
		expect(applyExperimentTheme(base, undefined, null)).toBe(base);
		expect(
			applyExperimentTheme(base, themed, {
				arm: 'bold',
				id: 'button-style',
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
		arms: {
			loud: {
				theme: {
					consentActions: {
						accept: { mode: 'filled', variant: 'primary' },
						reject: { mode: 'stroke', variant: 'neutral' },
					},
				},
			},
		},
		id: 'button-style',
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
		// The host styles accept and reject unequally; the arm evens them out,
		// so only the merged theme passes.
		expect(
			validateExperiment(
				{
					arms: {
						quiet: {
							theme: {
								consentActions: {
									reject: { mode: 'filled', variant: 'primary' },
								},
							},
						},
					},
					id: 'button-style',
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
		).toEqual({});
	});
});
