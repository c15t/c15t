'use client';

import {
	ConsentBanner,
	ConsentBoundary,
	ConsentDialog,
	offline,
} from 'c15t/next';
import type { ConsentBoundaryProps } from 'c15t/next';
import type { ReactNode } from 'react';

import { consentConfig } from '../c15t.config';
import { scripts } from '../lib/scripts';

// Brand tokens from app/globals.css (`--color-accent`, `--radius-*`). The
// plain-object form from components/consent-banner.mdx; `defineTheme` from
// 'c15t/react/types' gives the same shape with autocomplete.
const theme = {
	colors: { primary: '#4f6ef7', primaryHover: '#3d5bd9' },
	consentActions: {
		primary: { mode: 'filled', variant: 'primary' },
	},
	radius: { lg: '12px', md: '8px', sm: '6px' },
} as const;

// Slot classes: lift the floating card above the MobileTabBar (mobile) and
// the NowPlayingBar (sm and up) so they never overlap, and drop the card
// shadow to sit flat like the app's cards.
const bannerSlots = {
	card: { className: 'shadow-none' },
	root: { className: 'group mb-[3.75rem] sm:mb-[5.5rem]' },
};

// Without a backend URL the app runs in offline mode: bundled policy and
// browser storage, no consent records.
// Docs: /docs/frameworks/next/api-reference/data-fetching#offline-configuration
const options: NonNullable<ConsentBoundaryProps['options']> = {
	components: { banner: bannerSlots },
	theme,
};
if (!consentConfig) {
	options.mode = offline();
}

export const Consent = ({
	children,
	config,
}: {
	children: ReactNode;
	config: ConsentBoundaryProps['config'];
}) => (
	<ConsentBoundary
		config={config}
		consent={consentConfig ?? undefined}
		options={options}
		scripts={scripts}
	>
		{children}
		<ConsentBanner
			variant="floating"
			position="bottom-right"
			hideBranding
		/>
		<ConsentDialog />
	</ConsentBoundary>
);
