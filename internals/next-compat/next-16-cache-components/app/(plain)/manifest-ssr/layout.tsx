import {
	COMPAT_BACKEND_URL,
	COMPAT_MANIFEST_URL,
} from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { prefetchInitialConsent } from '@c15t/nextjs/server';
import { Suspense } from 'react';
import type { ReactNode } from 'react';

/**
 * Server-side init resolved from the same-origin manifest route. Under
 * `cacheComponents` the await must sit behind `<Suspense>` (see ssr).
 */
const ManifestSSRBoundary = async ({ children }: { children: ReactNode }) => {
	const config = await prefetchInitialConsent({
		backendURL: COMPAT_BACKEND_URL,
		manifestURL: COMPAT_MANIFEST_URL,
	});

	return (
		<ConsentShell
			config={config}
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
