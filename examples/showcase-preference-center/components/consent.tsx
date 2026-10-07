'use client';

import { ConsentDialog, ConsentRoot, offline } from 'c15t/next';
import type { ReactNode } from 'react';

import { northwindTheme } from '@/lib/theme';
import { i18n, scripts, vendors } from '@/lib/vendors';

import { CookieBanner } from './cookie-banner';

// Offline mode resolves the policy in the browser and keeps choices in this
// browser only, so the demo runs without an account. In production, point
// it at your backend instead:
//   const mode = hosted({ url: 'https://your-project.inth.app' });
const mode = offline();

export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentRoot
		state={{}}
		scripts={scripts}
		vendors={vendors}
		options={{ i18n, mode, theme: northwindTheme }}
	>
		{children}
		<CookieBanner />
		{/* Customize and the footer link go to /account/privacy. The dialog
		    stays for the "Do not sell or share" link some regions add to the
		    banner. */}
		<ConsentDialog />
	</ConsentRoot>
);
