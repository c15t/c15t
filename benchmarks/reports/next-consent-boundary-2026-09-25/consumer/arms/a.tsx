// Arm a: client init. No server resolution; the browser calls the
// same-origin init route after hydration.
import type { ReactNode } from 'react';

import { ConsentManager } from './consent-manager';

export const ConsentLayer = ({ children }: { children: ReactNode }) => (
	<ConsentManager>{children}</ConsentManager>
);
