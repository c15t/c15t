'use client';

import { gtag } from '@c15t/integrations/google-tag';
import { metaPixel } from '@c15t/integrations/meta-pixel';
import { tiktokPixel } from '@c15t/integrations/tiktok-pixel';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
} from '@c15t/nextjs';
import type { ConsentRootProps } from '@c15t/nextjs';
import type { ReactNode } from 'react';

import { NextjsBenchmarkProbe } from './probe';
import { getState } from './state';
import {
	benchVendorScripts,
	typicalInstallConfig,
} from './typical-install-config';

import './with-consent.css';

/**
 * Three common vendors through `@c15t/integrations`, as the Next.js scripts
 * guide registers them. Google tag always loads and signals Consent Mode;
 * Meta and TikTok wait for marketing consent. Each points at a local
 * stand-in so the bench measures when c15t starts them, not a CDN.
 */
const scripts = [
	gtag({
		category: 'measurement',
		id: 'G-BENCH00001',
		// gtag has no loader URL option; the script override replaces it.
		script: { src: `${benchVendorScripts.gtag}?id=G-BENCH00001` },
	}),
	metaPixel({
		pixelId: '100000000000001',
		scriptSrc: benchVendorScripts['meta-pixel'],
	}),
	tiktokPixel({
		pixelId: 'BENCHTIKTOK0001',
		scriptSrc: benchVendorScripts['tiktok-pixel'],
	}),
];

const options: ConsentRootProps['options'] = {
	callbacks: {
		onChoiceRecorded() {
			const state = getState('typical-install');
			if (state) {
				state.onChoiceRecordedCount += 1;
			}
		},
		onError() {
			const state = getState('typical-install');
			if (state) {
				state.onErrorCount += 1;
			}
		},
	},
	consentCategories: [
		'necessary',
		'functionality',
		'experience',
		'measurement',
		'marketing',
	],
	theme: {
		motion: {
			duration: {
				fast: '1ms',
				normal: '1ms',
				slow: '1ms',
			},
		},
	},
};

/**
 * The quickstart's client wrapper: one `ConsentRoot` with the config,
 * the scripts, the stock banner and dialog, and a preferences link.
 */
export const TypicalInstallConsent = ({
	children,
	state,
}: {
	children: ReactNode;
	state: ConsentRootProps['state'];
}) => (
	<ConsentRoot
		config={typicalInstallConfig}
		options={options}
		scripts={scripts}
		state={state}
	>
		<NextjsBenchmarkProbe scenario="typical-install" />
		{children}
		<ConsentBanner disableAnimation />
		<ConsentDialog disableAnimation />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentRoot>
);
