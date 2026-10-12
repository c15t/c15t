import { COMPAT_HOSTED_CONFIG } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

/**
 * The v3 server path: read request context, call `/init` on the server,
 * and hand the resolved state to the client root as a plain prop.
 */
const SSRLayout = async ({ children }: { children: ReactNode }) => {
	const state = await resolveConsent({ config: COMPAT_HOSTED_CONFIG });

	return (
		<ConsentShell
			nonce="compat-style-nonce"
			state={state}
			scenario="ssr"
		>
			{children}
		</ConsentShell>
	);
};

export default SSRLayout;
