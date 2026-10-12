import { COMPAT_CONSENT_CONFIG } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { resolveConsent } from '@c15t/nextjs/server';
import type { ReactNode } from 'react';

/**
 * Server-side init resolved from the backend manifest in manifest mode, so
 * the backend `/init` is never called. The server never fetches the app's
 * own consent route.
 */
const ManifestSSRLayout = async ({ children }: { children: ReactNode }) => {
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

export default ManifestSSRLayout;
