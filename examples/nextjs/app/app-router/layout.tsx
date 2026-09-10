import { prefetchInitialConsent } from 'c15t/next/server';
import type { ReactNode } from 'react';

import { consentConfig } from '../../c15t.config';
import { Consent } from '../../components/consent';

const Layout = ({ children }: { children: ReactNode }) => {
	const initialConsent = prefetchInitialConsent({ config: consentConfig });
	return <Consent config={initialConsent}>{children}</Consent>;
};

export default Layout;
