'use client';

import { crisp } from '@c15t/integrations/crisp';
import { ConsentBanner, ConsentDialog, ConsentRoot, local } from 'c15t/next';
import type { ReactNode } from 'react';

import { brandTheme } from '@/lib/consent-theme';

// Runs without a backend: policy rules ship with c15t and choices stay in
// this browser. In production, swap this line for your project's backend:
// const mode = hosted({ backendURL: 'https://your-project.inth.app' });
const mode = local();

// The support chat is a script, not an iframe. c15t adds it to the page only
// while Functionality is allowed. The script loader handles loading; the chat
// card in the article shows the placeholder.
const scripts = [
	crisp({
		websiteId:
			process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ?? 'YOUR_CRISP_WEBSITE_ID',
	}),
];

export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentRoot
		state={{}}
		scripts={scripts}
		options={{ mode, theme: brandTheme }}
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
	</ConsentRoot>
);
