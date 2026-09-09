'use client';

import type { PromptPosition, PromptVariant } from '@c15t/core';
import { createContext, useContext } from 'react';

/**
 * Geometry the banner root resolved for the active prompt: the shape it
 * takes, where it sits, whether that position came from the host, and
 * whether it blocks the page.
 *
 * @public
 */
export interface ConsentBannerSurface {
	/** Shape of the first-layer prompt. */
	variant: PromptVariant;
	/** Placement, already mirrored for right-to-left text when defaulted. */
	position: PromptPosition;
	/** Whether the host chose the position or the resolver defaulted it. */
	positionSource: 'host' | 'default';
	/** Backdrop, scroll lock, focus trap and no outside dismissal. */
	blocking: boolean;
}

/** Shape a compound banner takes before `ConsentBanner.Root` resolves one. */
export const DEFAULT_CONSENT_BANNER_SURFACE: ConsentBannerSurface = {
	blocking: false,
	position: 'bottom-left',
	positionSource: 'default',
	variant: 'floating',
};

export const ConsentBannerSurfaceContext = createContext<ConsentBannerSurface>(
	DEFAULT_CONSENT_BANNER_SURFACE
);

/**
 * Read the geometry `ConsentBanner.Root` resolved for the active prompt.
 *
 * @remarks
 * Outside a root this returns the floating bottom-left default so compound
 * parts still render.
 *
 * @returns The resolved variant, position, its source and blocking state.
 * @public
 */
export const useConsentBannerSurface =
	function useConsentBannerSurface(): ConsentBannerSurface {
		return useContext(ConsentBannerSurfaceContext);
	};

/**
 * Mirror a defaulted corner for right-to-left text so the banner keeps
 * hugging the reading start. Host-chosen positions and edge or center
 * placements are returned unchanged.
 *
 * @param position - The resolved position.
 * @param positionSource - Whether the host chose it.
 * @param variant - The resolved variant; only corners of floating and widget mirror.
 * @param textDirection - Document text direction.
 * @returns The position to render.
 * @internal
 */
export const mirrorDefaultPosition = function mirrorDefaultPosition(
	position: PromptPosition,
	positionSource: 'host' | 'default',
	variant: PromptVariant,
	textDirection: 'ltr' | 'rtl'
): PromptPosition {
	if (
		positionSource === 'host' ||
		textDirection !== 'rtl' ||
		(variant !== 'floating' && variant !== 'widget')
	) {
		return position;
	}
	if (position.endsWith('-left')) {
		return position.replace('-left', '-right') as PromptPosition;
	}
	if (position.endsWith('-right')) {
		return position.replace('-right', '-left') as PromptPosition;
	}
	return position;
};
