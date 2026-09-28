import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

/** The `ssr-stream` layout, with a gated embed in the page. */
const GateStreamLayout = ({ children }: { children: ReactNode }) => {
	const state = resolveConsent({ backendURL: COMPAT_BACKEND_URL });

	return (
		<ConsentShell
			state={state}
			scenario="gate-stream"
		>
			{children}
		</ConsentShell>
	);
};

export default GateStreamLayout;
