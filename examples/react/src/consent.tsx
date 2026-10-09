// #region docs:consent
import { manifest } from '@c15t/browser/headless';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
} from 'c15t/react';
import type { ReactNode } from 'react';

import { consentManifest } from './c15t-manifest';
import { scripts } from './scripts';

const mode = manifest({
	backendURL: import.meta.env.VITE_C15T_BACKEND_URL,
	snapshot: consentManifest,
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
