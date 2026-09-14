import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

/**
 * The v3 server path: read request context, call `/init` on the server,
 * and hand the resolved state to the client root as a plain prop.
 */
const SSRLayout = async ({ children }: { children: ReactNode }) => {
	const state = await resolveConsent({
		backendURL: COMPAT_BACKEND_URL,
	});

	return (
		<ConsentShell
			state={state}
			scenario="ssr"
		>
			{children}
		</ConsentShell>
	);
};

export default SSRLayout;
