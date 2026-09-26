// Arm c: the streaming form. The layout stays synchronous and passes the
// pending resolveConsent promise to the provider, so page content renders
// without waiting; consent surfaces stay hidden until the promise resolves.
import type { ReactNode } from 'react';

import { resolveBenchConsent } from './bench-consent';
import { ConsentManager } from './consent-manager';

export const ConsentLayer = ({ children }: { children: ReactNode }) => {
	const state = resolveBenchConsent();
	return <ConsentManager prefetch={state}>{children}</ConsentManager>;
};
