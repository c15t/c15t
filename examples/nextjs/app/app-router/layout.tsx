import { prefetchInitialConsent } from 'c15t/next/server';
import type { ReactNode } from 'react';

import { consentConfig, demoLocation } from '../../c15t.config';
import { Consent } from '../../components/consent';

const Layout = async ({ children }: { children: ReactNode }) => {
	const initialConsent = await prefetchInitialConsent({
		config: consentConfig,
		...demoLocation,
	});
	return <Consent config={initialConsent}>{children}</Consent>;
};

export default Layout;
