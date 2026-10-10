'use client';

import { crisp } from '@c15t/integrations/crisp';
import type { Vendor } from 'c15t';
import { ConsentBanner, ConsentDialog, ConsentRoot, offline } from 'c15t/next';
import type { ReactNode } from 'react';

import { brandTheme } from '@/lib/consent-theme';

// Runs without a backend: policy rules ship with c15t and choices stay in
// this browser. In production, swap this line for your project's backend:
// const mode = hosted({ backendURL: 'https://your-project.inth.app' });
const mode = offline();

// The support chat is a script, not an iframe. c15t adds it to the page only
// while Functionality is allowed. The script loader handles loading; the chat
// card in the article shows the placeholder.
const scripts = [
	crisp({
		websiteId:
			process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ?? 'YOUR_CRISP_WEBSITE_ID',
	}),
];

// Names the vendor the Crisp helper loads, so Privacy settings lists Crisp
// under Functionality.
const vendors: Vendor[] = [
	{
		category: 'functionality',
		id: 'crisp',
		name: 'Crisp',
		privacyPolicyUrl: 'https://crisp.chat/en/privacy/',
	},
];

export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentRoot
		state={{}}
		scripts={scripts}
		vendors={vendors}
		options={{ mode, theme: brandTheme }}
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
	</ConsentRoot>
);
