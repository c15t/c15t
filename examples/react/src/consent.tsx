// #region docs:consent
import { posthog } from '@c15t/integrations/posthog';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	hosted,
} from 'c15t/react';
import type { ReactNode } from 'react';

const options = {
	// Asks VITE_C15T_BACKEND_URL for each visitor's policy.
	mode: hosted(),
	scripts: [
		posthog({
			id: 'phc_your_project_key',
			initOptions: { cookieless_mode: 'never' },
			loadMode: 'after-consent',
		}),
	],
};

export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentProvider options={options}>
		{children}
		<ConsentBanner />
		<ConsentDialog />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentProvider>
);
// #endregion docs:consent
