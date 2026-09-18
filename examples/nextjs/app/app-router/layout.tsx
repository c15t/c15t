import { resolveConsent } from 'c15t/next/server';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import { consentConfig, demoLocation } from '../../c15t.config';
import { Consent } from '../../components/consent';
import { isExperimentArm } from '../../lib/experiment';

const Layout = async ({ children }: { children: ReactNode }) => {
	const initialConsent = await resolveConsent({
		config: consentConfig,
		...demoLocation,
	});
	// `?experiment=1` runs the banner-shape experiment and `&arm=wall` is
	// the arm the server resolved (proxy.ts copies both into headers). This
	// is where `const arm = await bannerShape()` from the Vercel Flags SDK,
	// or any other flag provider, would go.
	const requestHeaders = await headers();
	const experiment = requestHeaders.get('x-example-experiment') === '1';
	const arm = requestHeaders.get('x-example-experiment-arm');
	return (
		<Consent
			state={initialConsent}
			experiment={experiment}
			experimentVariant={isExperimentArm(arm) ? arm : undefined}
		>
			{children}
		</Consent>
	);
};

export default Layout;
