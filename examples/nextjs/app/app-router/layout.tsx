import { resolveConsent } from 'c15t/next/server';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import { consentConfig, demoLocation } from '../../c15t.config';
import { Consent } from '../../components/consent';
import { toExperimentArm } from '../../lib/experiment';

/**
 * Starts consent resolution for this request and passes the pending result to
 * `ConsentRoot` without awaiting it, so the page renders without waiting for
 * the manifest. The banner mounts after hydration. To put the resolved banner
 * in the server HTML instead, await it in an async component inside
 * `<Suspense>`; see the App Router guide.
 */
const Layout = async ({ children }: { children: ReactNode }) => {
	const state = resolveConsent({
		config: consentConfig,
		...demoLocation,
	});
	// `?experiment=1` runs the banner-shape experiment and `&arm=wall` is
	// the arm the server resolved (proxy.ts copies both into headers); any
	// other `arm` value is `control`, and no `arm` lets c15t pick. This
	// is where `const arm = await bannerShape()` from the Vercel Flags SDK,
	// or any other flag provider, would go. Reading headers does not wait
	// for the manifest, so `state` stays pending.
	const requestHeaders = await headers();
	const experiment = requestHeaders.get('x-example-experiment') === '1';
	const arm = requestHeaders.get('x-example-experiment-arm');
	return (
		<Consent
			state={state}
			experiment={experiment}
			experimentArm={arm === null ? undefined : toExperimentArm(arm)}
		>
			{children}
		</Consent>
	);
};

export default Layout;
