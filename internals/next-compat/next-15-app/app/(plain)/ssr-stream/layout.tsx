import { COMPAT_HOSTED_CONFIG } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

/**
 * The streaming form: hand the root the pending promise instead of
 * awaiting it, so the layout stays synchronous.
 */
const SSRStreamLayout = ({ children }: { children: ReactNode }) => {
	const state = resolveConsent({ config: COMPAT_HOSTED_CONFIG });

	return (
		<ConsentShell
			state={state}
			scenario="ssr-stream"
		>
			{children}
		</ConsentShell>
	);
};

export default SSRStreamLayout;
