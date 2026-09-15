import { resolveConsent } from 'c15t/next/server';
import type { ReactNode } from 'react';

import { consentConfig, demoLocation } from '../../c15t.config';
import { Consent } from '../../components/consent';

const Layout = async ({ children }: { children: ReactNode }) => {
	const initialConsent = await resolveConsent({
		config: consentConfig,
		...demoLocation,
	});
	return <Consent state={initialConsent}>{children}</Consent>;
};

export default Layout;
