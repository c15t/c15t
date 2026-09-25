// Arm b: the site's and the c15t App Router guide's layout. The page renders
// inside <Suspense fallback={null}> while resolveConsent is awaited.
import { Suspense } from 'react';
import type { ReactNode } from 'react';

import { resolveBenchConsent } from './bench-consent';
import { ConsentManager } from './consent-manager';

const AwaitedConsent = async ({ children }: { children: ReactNode }) => {
	const state = await resolveBenchConsent();
	return <ConsentManager prefetch={state}>{children}</ConsentManager>;
};

export const ConsentLayer = ({ children }: { children: ReactNode }) => (
	<Suspense fallback={null}>
		<AwaitedConsent>{children}</AwaitedConsent>
	</Suspense>
);
