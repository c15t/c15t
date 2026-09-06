import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { prefetchInitialConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

/**
 * The v3 server path: read request context, call `/init` on the server,
 * and hand the resolved config to the client boundary as a plain prop.
 */
const SSRLayout = async ({ children }: { children: ReactNode }) => {
	const config = await prefetchInitialConsent({
		backendURL: COMPAT_BACKEND_URL,
	});

	return (
		<ConsentShell
			config={config}
			scenario="ssr"
		>
			{children}
		</ConsentShell>
	);
};

export default SSRLayout;
