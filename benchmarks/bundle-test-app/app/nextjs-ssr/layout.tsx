import type { ReactNode } from 'react';

import { resolve } from './consent-api/server';
import { NextjsSSRProvider } from './provider';

const NextjsSSRLayout = async ({ children }: { children: ReactNode }) => {
	const state = await resolve({
		backendURL: '/api/bench-consent',
	});

	return <NextjsSSRProvider state={state}>{children}</NextjsSSRProvider>;
};

export default NextjsSSRLayout;
