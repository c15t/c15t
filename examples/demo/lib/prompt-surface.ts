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
	ConsentPresentation,
	PromptPosition,
	PromptPresentation,
	PromptVariant,
} from 'c15t';

/** Prompt shape chosen in the URL. Empty strings mean "let the resolver pick". */
export interface SurfaceParams {
	variant: PromptVariant | '';
	position: PromptPosition | '';
	blocking: boolean;
}

export const EMPTY_SURFACE: SurfaceParams = {
	blocking: false,
	position: '',
	variant: '',
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
	return {
		blocking: searchParams.get('blocking') === '1',
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
	if (surface.variant) {
		params.set('variant', surface.variant);
	}
	if (surface.position) {
		params.set('position', surface.position);
	}
	if (surface.blocking) {
		params.set('blocking', '1');
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
