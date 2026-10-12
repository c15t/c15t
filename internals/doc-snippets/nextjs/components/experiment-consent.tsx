'use client';

import { ConsentBanner, ConsentDialog, ConsentRoot } from 'c15t/next';
import type { ConsentRootProps } from 'c15t/next';
import type { ReactNode } from 'react';

import { experimentCallbacks } from '@/lib/experiment';

/** The `Consent` wrapper with the banner experiment's event callbacks. */
export const ExperimentConsent = ({
	children,
	state,
}: {
	children: ReactNode;
	state: ConsentRootProps['state'];
}) => (
	<ConsentRoot
		state={state}
		options={{ callbacks: experimentCallbacks }}
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
	</ConsentRoot>
);
