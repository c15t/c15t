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
	/** Placement. It stays the same for right-to-left text. */
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
