'use client';

import type {
	ConsentExperiment,
	ConsentPresentation,
	LegalLinks,
} from '@c15t/core';
import { createContext, useContext } from 'react';

import type { ReactComponentSlots } from '~/types/slots';
import type { Theme } from '~/types/theme';

export interface V3UIConfigValue {
	components?: ReactComponentSlots;
	/** The host's base presentation, before any experiment arm is applied. */
	presentation?: ConsentPresentation;
	/** The configured experiment; the assigned arm lives on the snapshot. */
	experiment?: ConsentExperiment;
	/** The host's base theme, before any experiment arm is applied. */
	theme?: Theme;
	legalLinks?: LegalLinks;
}

export const V3UIConfigContext = createContext<V3UIConfigValue>({});
V3UIConfigContext.displayName = 'C15tV3UIConfigContext';

export const useUIConfig = function useUIConfig() {
	return useContext(V3UIConfigContext);
};
