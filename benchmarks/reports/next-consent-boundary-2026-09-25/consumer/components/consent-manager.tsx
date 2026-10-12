'use client';

// Mirrors the c15t docs site's ConsentManager: prebuilt banner + deferred
// dialog from `c15t/react`, hosted mode with a same-origin init route, the
// site's colour-only theme, and a tracking script gated on measurement.
import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	hosted,
	useConsentManager,
} from 'c15t/react';
import type { ConsentProviderOptions } from 'c15t/react';
import type { ReactNode } from 'react';

import { ConsumerProbe, getProbeState } from './probe';

export { ConsentGate } from 'c15t/react';

const docsConsentTheme: NonNullable<ConsentProviderOptions['theme']> = {
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

// A same-origin stand-in for a measurement tag, so the harness can assert on
// the network request itself.
const scripts: NonNullable<ConsentProviderOptions['scripts']> = [
	{
		category: 'measurement',
		id: 'bench-tracker',
		src: '/tracker.js',
	},
];

export const ConsentManager = ({
	children,
	prefetch,
}: {
	children: ReactNode;
	prefetch?: ConsentProviderOptions['prefetch'];
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
			mode: hosted({
				assertDecisionInputs: true,
				initURL: '/api/c15t/init',
				url: '/api/bench-consent',
			}),
			prefetch,
			scripts,
			theme: docsConsentTheme,
		}}
	>
		<ConsumerProbe />
		{children}
		<ConsentBanner hideBranding />
		<ConsentDialog hideBranding />
	</ConsentProvider>
);

/** Mirrors the site's ConsentFooter: reopens the dialog. */
export const ConsentFooter = () => {
	const { setActiveUI } = useConsentManager();
	return (
		<button
			className="underline"
			type="button"
			onClick={() => setActiveUI('dialog')}
		>
			Manage my preferences
		</button>
	);
};
