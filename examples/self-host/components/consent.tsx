'use client';

import { posthog } from '@c15t/integrations/posthog';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
	defineConsentConfig,
} from 'c15t/next';
import type { ReactNode } from 'react';

// The backend runs in this app, so the browser calls it on the same origin.
const consentConfig = defineConsentConfig({ backendURL: '/api/c15t' });

const scripts = [
	posthog({
		id: 'phc_your_project_key',
		initOptions: { cookieless_mode: 'never' },
		loadMode: 'after-consent',
	}),
];

export const Consent = ({ children }: { children: ReactNode }) => (
	// An empty state makes the browser call `/api/c15t/init` after hydration.
	<ConsentRoot
		state={{}}
		config={consentConfig}
		scripts={scripts}
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentRoot>
);
