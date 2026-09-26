import { resolveConsent } from 'c15t/next/server';
import type { ReactNode } from 'react';

import { consentConfig, demoLocation } from '../../c15t.config';
import { Consent } from '../../components/consent';

/**
 * Starts consent resolution for this request and passes the pending result to
 * `ConsentRoot` without awaiting it, so the page renders without waiting for
 * the manifest. The banner mounts after hydration. To put the resolved banner
 * in the server HTML instead, await it in an async component inside
 * `<Suspense>`; see the App Router guide.
 */
const Layout = ({ children }: { children: ReactNode }) => {
	const state = resolveConsent({
		config: consentConfig,
		...demoLocation,
	});
	return <Consent state={state}>{children}</Consent>;
};

export default Layout;
