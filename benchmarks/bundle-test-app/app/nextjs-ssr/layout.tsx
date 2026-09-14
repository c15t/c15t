import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

import { NextjsSSRProvider } from './provider';

const NextjsSSRLayout = async ({ children }: { children: ReactNode }) => {
	const state = await resolveConsent({
		backendURL: '/api/bench-consent',
	});

	return <NextjsSSRProvider state={state}>{children}</NextjsSSRProvider>;
};

export default NextjsSSRLayout;
