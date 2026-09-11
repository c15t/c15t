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

// Offline mode: bundled policy + browser storage, no backend records.
// Docs: /docs/frameworks/next/api-reference/data-fetching#offline-configuration
const mode = offline();

// Brand tokens from app/globals.css (`--color-accent`, `--radius-*`). The
// plain-object form from components/consent-banner.mdx; `defineTheme` from
// 'c15t/react/types' gives the same shape with autocomplete.
const theme = {
	colors: { primary: '#4f6ef7', primaryHover: '#3d5bd9' },
	radius: { lg: '12px', md: '8px', sm: '6px' },
	consentActions: {
		primary: { variant: 'primary', mode: 'filled' },
	},
} as const;

// Slot classes: lift the floating card above the NowPlayingBar so the two
// never overlap, and drop the card shadow to sit flat like the app's cards.
const bannerSlots = {
	root: { className: 'group sm:mb-[5.5rem]' },
	card: { className: 'shadow-none' },
};

export function Consent({
	children,
	config,
}: {
	children: ReactNode;
	config: ConsentBoundaryProps['config'];
}) {
	return (
		<ConsentBoundary
			config={config}
			consent={consentConfig ?? undefined}
			options={{
				...(consentConfig ? {} : { mode }),
				theme,
				components: { banner: bannerSlots },
			}}
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
}
