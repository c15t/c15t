'use client';

import type {
	ConsentExperiment,
	ConsentPresentation,
	LegalLinks,
} from '@c15t/core';
import { createContext, useContext } from 'react';

import type { ReactComponentSlots } from '~/types/slots';

export interface V3UIConfigValue {
	components?: ReactComponentSlots;
	/** The host's base presentation, before any experiment arm is applied. */
	presentation?: ConsentPresentation;
	/** The configured experiment; the assigned arm lives on the snapshot. */
	experiment?: ConsentExperiment;
	legalLinks?: LegalLinks;
}

export const V3UIConfigContext = createContext<V3UIConfigValue>({});
V3UIConfigContext.displayName = 'C15tV3UIConfigContext';

export const useUIConfig = function useUIConfig() {
	return useContext(V3UIConfigContext);
};
