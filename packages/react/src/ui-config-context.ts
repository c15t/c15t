'use client';

import type { LegalLinks, ConsentPresentation } from '@c15t/core';
import { createContext, useContext } from 'react';

import type { ReactComponentSlots } from '~/types/slots';

export interface V3UIConfigValue {
	components?: ReactComponentSlots;
	presentation?: ConsentPresentation;
	legalLinks?: LegalLinks;
}

export const V3UIConfigContext = createContext<V3UIConfigValue>({});
V3UIConfigContext.displayName = 'C15tV3UIConfigContext';

export const useUIConfig = function useUIConfig() {
	return useContext(V3UIConfigContext);
};
