import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { prefetchInitialConsent } from '@c15t/nextjs/server';
import { Suspense } from 'react';
import type { ReactNode } from 'react';

/**
 * Under `cacheComponents`, awaiting request data directly in a layout is a
 * build error (`blocking-prerender-dynamic`). The only way to keep the
 * documented `prefetchInitialConsent` + `ConsentBoundary` pattern building
 * is to move the await into an async child behind `<Suspense>`, which puts
 * the whole boundary in the postponed hole. The suite then checks what that
 * costs: the first HTML no longer carries the banner.
 */
const SSRBoundary = async ({ children }: { children: ReactNode }) => {
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

const SSRLayout = ({ children }: { children: ReactNode }) => (
	<Suspense fallback={null}>
		<SSRBoundary>{children}</SSRBoundary>
	</Suspense>
);

export default SSRLayout;
