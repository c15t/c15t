'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	hosted,
} from 'c15t/react';
import type { ConsentProviderOptions } from 'c15t/react';
import type { ReactNode } from 'react';

import { ConsumerProbe, getProbeState } from './probe';

type ConsentState = NonNullable<ConsentProviderOptions['prefetch']>;

/** A full custom theme, including a dark variant, like a branded site. */
const theme: NonNullable<ConsentProviderOptions['theme']> = {
	colors: {
		border: '#E0E0E0',
		primary: 'hsl(172 72.2% 48%)',
		primaryHover: 'hsl(172 72% 48% / 0.1)',
		surface: '#FFFFFF',
		surfaceHover: '#F5F5F5',
		switchTrack: '#E0E0E0',
		switchTrackActive: 'hsl(172 72.2% 48%)',
		text: '#000000',
		textMuted: '#555555',
	},
	dark: {
		border: '#333333',
		primary: 'hsl(172 72.2% 48%)',
		primaryHover: 'hsl(172 72% 48% / 0.1)',
		surface: '#000000',
		surfaceHover: '#111111',
		switchTrack: '#333333',
		switchTrackActive: 'hsl(172 72.2% 48%)',
		text: '#FFFFFF',
		textMuted: '#CCCCCC',
	},
};

const consentCategories = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] satisfies NonNullable<ConsentProviderOptions['consentCategories']>;

export const ConsentManager = ({
	children,
	state,
}: {
	children: ReactNode;
	state: ConsentState;
}) => (
	<ConsentProvider
		options={{
			callbacks: {
				onChoiceRecorded() {
					const probe = getProbeState();
					if (probe) {
						probe.onChoiceRecordedCount += 1;
					}
				},
			},
			consentCategories,
			mode: hosted({ url: '/api/bench-consent' }),
			prefetch: state,
			theme,
		}}
	>
		<ConsumerProbe />
		{children}
		<ConsentBanner />
		<ConsentDialog />
	</ConsentProvider>
);
