import { normalizePolicyRule } from '@c15t/schema/types';
import { describe, expect, it } from 'vitest';

import {
	assignExperimentVariant,
	resolveExperimentPresentation,
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
});
