// Arm e: the CLI template and examples/nextjs form. The layout awaits
// resolveConsent with no Suspense boundary, so the whole response waits.
// Only builds without cacheComponents (Next rejects it otherwise).
import type { ReactNode } from 'react';

import { resolveBenchConsent } from './bench-consent';
import { ConsentManager } from './consent-manager';

export const ConsentLayer = async ({ children }: { children: ReactNode }) => {
	const state = await resolveBenchConsent();
	return <ConsentManager prefetch={state}>{children}</ConsentManager>;
};
