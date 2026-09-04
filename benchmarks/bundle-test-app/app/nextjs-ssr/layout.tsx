import { prefetchInitialConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

import { NextjsSSRProvider } from './provider';

const NextjsSSRLayout = async ({ children }: { children: ReactNode }) => {
	const config = await prefetchInitialConsent({
		backendURL: '/api/bench-consent',
	});

	return <NextjsSSRProvider config={config}>{children}</NextjsSSRProvider>;
};

export default NextjsSSRLayout;
