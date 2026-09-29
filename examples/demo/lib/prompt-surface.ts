/**
 * URL-driven prompt surface for the demo pages.
 *
 * `variant`, `position` and `blocking=1` search params layer over a
 * scenario's own presentation so a visitor can try every shape without
 * editing config. Kept free of React so `prompt-surface.test.ts` runs in
 * Node.
 */

import { PROMPT_VARIANT_POSITIONS } from 'c15t';
import type {
	ConsentExperiment,
	ConsentPresentation,
	ExperimentReporter,
	PromptPosition,
	PromptPresentation,
	PromptVariant,
} from 'c15t';

/** Arms of the demo's banner-shape experiment (`?experiment=1`). */
export const EXPERIMENT_ARMS = ['floating', 'bar'] as const;

export type ExperimentArm = (typeof EXPERIMENT_ARMS)[number];

/** Prompt shape chosen in the URL. Empty strings mean "let the resolver pick". */
export interface SurfaceParams {
	variant: PromptVariant | '';
	position: PromptPosition | '';
	blocking: boolean;
	/** `experiment=1`: run the banner-shape experiment instead of `presentation`. */
	experiment: boolean;
	/** `arm=`: force the arm, as a flag provider would. Empty lets c15t assign. */
	arm: ExperimentArm | '';
}

export const EMPTY_SURFACE: SurfaceParams = {
	arm: '',
	blocking: false,
	experiment: false,
	position: '',
	variant: '',
};

export const isExperimentArm = function isExperimentArm(
	value: string
): value is ExperimentArm {
	return (EXPERIMENT_ARMS as readonly string[]).includes(value);
};

export const PROMPT_VARIANTS = [
	'floating',
	'bar',
	'widget',
	'wall',
] as const satisfies readonly PromptVariant[];

export const isPromptVariant = function isPromptVariant(
	value: string
): value is PromptVariant {
	return (PROMPT_VARIANTS as readonly string[]).includes(value);
};

/** Whether a variant accepts a position. Any variant when `variant` is empty. */
export const isPositionFor = function isPositionFor(
	variant: PromptVariant | '',
	value: string
): value is PromptPosition {
	const variants = variant ? [variant] : PROMPT_VARIANTS;
	return variants.some((item) =>
		(PROMPT_VARIANT_POSITIONS[item] as readonly string[]).includes(value)
	);
};

/**
 * Read the surface from search params. Unknown variants and positions the
 * variant does not accept are dropped rather than passed to the resolver.
 */
export const parseSurfaceParams = function parseSurfaceParams(
	searchParams: URLSearchParams
): SurfaceParams {
	const rawVariant = searchParams.get('variant') ?? '';
	const variant = isPromptVariant(rawVariant) ? rawVariant : '';
	const rawPosition = searchParams.get('position') ?? '';
	const position = isPositionFor(variant, rawPosition) ? rawPosition : '';
	const experiment = searchParams.get('experiment') === '1';
	const rawArm = searchParams.get('arm') ?? '';
	return {
		// An arm without the experiment has nothing to force.
		arm: experiment && isExperimentArm(rawArm) ? rawArm : '',
		blocking: searchParams.get('blocking') === '1',
		experiment,
		position,
		variant,
	};
};

/** Write the surface into search params, omitting anything left to the resolver. */
export const applySurfaceParams = function applySurfaceParams(
	params: URLSearchParams,
	surface: SurfaceParams
): URLSearchParams {
	params.delete('variant');
	params.delete('position');
	params.delete('blocking');
	params.delete('experiment');
	params.delete('arm');
	if (surface.variant) {
		params.set('variant', surface.variant);
	}
	if (surface.position) {
		params.set('position', surface.position);
	}
	if (surface.blocking) {
		params.set('blocking', '1');
	}
	if (surface.experiment) {
		params.set('experiment', '1');
		if (surface.arm) {
			params.set('arm', surface.arm);
		}
	}
	return params;
};

/** Change the variant and drop a position it cannot accept. */
export const setSurfaceVariant = function setSurfaceVariant(
	surface: SurfaceParams,
	variant: PromptVariant | ''
): SurfaceParams {
	const position =
		surface.position && isPositionFor(variant, surface.position)
			? surface.position
			: '';
	return { ...surface, position, variant };
};

/** Positions the position control may offer for the chosen variant. */
export const surfacePositionOptions = function surfacePositionOptions(
	variant: PromptVariant | ''
): readonly PromptPosition[] {
	return variant ? PROMPT_VARIANT_POSITIONS[variant] : [];
};

/** Layer the URL surface over a scenario's own presentation. */
export const withSurface = function withSurface(
	presentation: ConsentPresentation | undefined,
	surface: SurfaceParams
): ConsentPresentation | undefined {
	if (!surface.variant && !surface.position && !surface.blocking) {
		return presentation;
	}
	const prompt: PromptPresentation = { ...presentation?.prompt };
	if (surface.variant) {
		prompt.variant = surface.variant;
	}
	if (surface.position) {
		prompt.position = surface.position;
	}
	if (surface.blocking) {
		prompt.blocking = true;
	}
	return { ...presentation, prompt };
};

/**
 * The demo's banner-shape experiment, or `undefined` when the URL did not
 * ask for one. `floating` is the base shape; `bar` is the arm under test.
 * A bar is valid for both `choice` and `notice` prompts; a wall would trip
 * `blocking-forbidden` under the opt-out notice scenario.
 * A forced `arm` shows host-resolved assignment; otherwise c15t assigns.
 * Events go to `window.dataLayer` and to `report`, which the page renders.
 */
export const demoExperiment = function demoExperiment(
	surface: Pick<SurfaceParams, 'arm' | 'experiment'>,
	report: ExperimentReporter
): ConsentExperiment | undefined {
	if (!surface.experiment) {
		return undefined;
	}
	return {
		id: 'banner-shape',
		reportTo: ['dataLayer', report],
		variant: surface.arm || undefined,
		variants: {
			bar: { prompt: { position: 'bottom', variant: 'bar' } },
			floating: {},
		},
	};
};
