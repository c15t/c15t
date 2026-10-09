// #region docs:consent
import { manifest } from '@c15t/browser/headless';
import { snapshot } from 'c15t/generated';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
} from 'c15t/react';
import type { ReactNode } from 'react';

import { scripts } from './scripts';

const mode = manifest({
	backendURL: import.meta.env.VITE_C15T_BACKEND_URL,
	// The policy consentManifest() in vite.config.ts downloaded.
	manifest: snapshot,
});

export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentProvider options={{ mode, scripts }}>
		{children}
		<ConsentBanner />
		<ConsentDialog />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentProvider>
);
// #endregion docs:consent
