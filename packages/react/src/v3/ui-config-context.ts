'use client';

import type { LegalLinks } from 'c15t';
import { createContext, useContext } from 'react';
import type { ReactComponentSlots } from '~/v3/types/slots';

export interface V3UIConfigValue {
	components?: ReactComponentSlots;
	legalLinks?: LegalLinks;
}

export const V3UIConfigContext = createContext<V3UIConfigValue>({});
V3UIConfigContext.displayName = 'C15tV3UIConfigContext';

export function useUIConfig() {
	return useContext(V3UIConfigContext);
}
