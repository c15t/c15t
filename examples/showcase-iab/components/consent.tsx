'use client';

import { ConsentRoot, offline, policyRulePresets } from 'c15t/next';
import { ConsentGPP } from 'c15t/react/gpp';
import {
	IABConsentBanner,
	IABConsentDialog,
	IABProvider,
} from 'c15t/react/iab';
import type { ReactNode } from 'react';

import { brandTheme } from '@/lib/consent-theme';

// Runs without a backend. The Europe IAB preset is the rule c15t's
// recommended pack uses for the EEA and the UK, and it is also the fallback
// for an unknown location, which is every visitor in offline mode. Choices
// stay in this browser. In production, swap this line for your backend,
// which resolves the visitor's region and sends the vendor list with it:
// const mode = hosted({ backendURL: 'https://your-project.inth.app' });
const mode = offline({ policyRules: [policyRulePresets.europeIab()] });

// A demonstration CMP ID, the same one c15t's own IAB demos use. Every TC
// string names the CMP that wrote it, so a real site uses the ID IAB Europe
// assigned when its CMP registered: https://register.consensu.org/CMP
const CMP_ID = 160;

// A three-vendor list served from public/vendor-list.json so the demo runs
// offline. Its vendors are made up. In production, remove `gvlURL`: c15t then
// loads the official Global Vendor List, either through your backend with
// `hosted()` or from c15t's GVL endpoint, filtered to the vendors you work
// with through the `vendors` prop.
const GVL_URL = '/vendor-list.json';

// The IAB surfaces do not render their own styles yet, so app/globals.css
// imports c15t's stylesheets and `styles: false` keeps the stock surfaces
// from adding a second copy.
export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentRoot
		state={{}}
		options={{ mode, styles: false, theme: brandTheme }}
	>
		{/* Before the page, so __tcfapi exists when the ad slots ask for it. */}
		<IABProvider
			cmpId={CMP_ID}
			gvlURL={GVL_URL}
		>
			<IABConsentBanner />
			<IABConsentDialog />
		</IABProvider>
		{/* The same TC string, as the tcfeuv2 section of a GPP string, for ad
		    tech that reads window.__gpp instead of window.__tcfapi. */}
		<ConsentGPP />
		{children}
	</ConsentRoot>
);
