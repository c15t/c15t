'use client';

import { ConsentBanner, ConsentDialog, ConsentRoot, offline } from 'c15t/next';
import type { ClearOnRevocationConfig, ConsentRootProps } from 'c15t/next';
import type { ReactNode } from 'react';

import { brandTheme } from '@/lib/consent-theme';
import { rememberRevocation } from '@/lib/revocation-storage';
import { scripts, vendors } from '@/lib/scripts';

import { ConsentDevTools } from './consent-dev-tools';

// Runs without a backend: policy rules ship with c15t and choices stay in
// this browser. In production, swap this line for your project's backend:
// const mode = hosted({ url: 'https://your-project.inth.app' });
const mode = offline();

const options: ConsentRootProps['options'] = {
	callbacks: {
		// Turning off a category that was on reloads the page, because code a
		// vendor already ran can't be unloaded. Leave a note for the next page.
		onBeforeConsentRevocationReload: rememberRevocation,
	},
	mode,
	// The layout renders the tokens; the components read the button roles.
	theme: brandTheme,
};

// The reload stops vendor code, but cookies it already wrote stay. c15t
// deletes these whenever their category is denied.
const clearOnRevocation: ClearOnRevocationConfig = {
	marketing: { cookies: ['_fbp', '_fbc'] },
	measurement: {
		cookies: ['_ga', '_ga_*', 'ph_*'],
		localStorage: ['ph_*'],
	},
};

export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentRoot
		state={{}}
		scripts={scripts}
		vendors={vendors}
		clearOnRevocation={clearOnRevocation}
		options={options}
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
		<ConsentDevTools />
	</ConsentRoot>
);
