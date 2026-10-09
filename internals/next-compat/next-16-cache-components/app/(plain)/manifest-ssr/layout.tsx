import { COMPAT_CONSENT_CONFIG } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { resolveConsent } from '@c15t/nextjs/server';
import { Suspense } from 'react';
import type { ReactNode } from 'react';

/**
 * Server-side init resolved from the backend manifest in manifest mode.
 * Under `cacheComponents` the await must sit behind `<Suspense>` (see ssr).
 */
const ManifestSSRBoundary = async ({ children }: { children: ReactNode }) => {
	const state = await resolveConsent({ config: COMPAT_CONSENT_CONFIG });

	return (
		<ConsentShell
			state={state}
			scenario="manifest-ssr"
			transport="manifest"
		>
			{children}
		</ConsentShell>
	);
};

const ManifestSSRLayout = ({ children }: { children: ReactNode }) => (
	<Suspense fallback={null}>
		<ManifestSSRBoundary>{children}</ManifestSSRBoundary>
	</Suspense>
);

export default ManifestSSRLayout;
