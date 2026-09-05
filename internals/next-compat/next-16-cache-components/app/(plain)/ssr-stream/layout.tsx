import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { prefetchInitialConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

/**
 * The streaming form: hand the boundary the pending promise instead of
 * awaiting it, so the layout stays synchronous.
 */
const SSRStreamLayout = ({ children }: { children: ReactNode }) => {
	const config = prefetchInitialConsent({ backendURL: COMPAT_BACKEND_URL });

	return (
		<ConsentShell
			config={config}
			scenario="ssr-stream"
		>
			{children}
		</ConsentShell>
	);
};

export default SSRStreamLayout;
