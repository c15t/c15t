import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { resolveConsent } from '@c15t/nextjs/server';
import { Suspense } from 'react';
import type { ReactNode } from 'react';

/**
 * The `ssr` layout with a gated embed in the page. The page streams inside
 * the postponed boundary: React parses it into a hidden segment and then
 * moves it into place, which reloads any iframe that was already loading.
 */
const GateSSRBoundary = async ({ children }: { children: ReactNode }) => {
	const state = await resolveConsent({
		backendURL: COMPAT_BACKEND_URL,
	});

	return (
		<ConsentShell
			state={state}
			scenario="gate-ssr"
		>
			{children}
		</ConsentShell>
	);
};

const GateSSRLayout = ({ children }: { children: ReactNode }) => (
	<Suspense fallback={null}>
		<GateSSRBoundary>{children}</GateSSRBoundary>
	</Suspense>
);

export default GateSSRLayout;
