'use client';

import type { LegalLinks } from 'c15t';
import { createContext } from 'react';

export interface V3UIConfigValue {
	legalLinks?: LegalLinks;
}

export const V3UIConfigContext = createContext<V3UIConfigValue>({});
V3UIConfigContext.displayName = 'C15tV3UIConfigContext';
