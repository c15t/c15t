'use client';

import { ConsentBanner, ConsentDialog, ConsentRoot } from 'c15t/next';
import type { ConsentRootProps } from 'c15t/next';
import type { ReactNode } from 'react';

import { consentConfig } from '@/c15t.config';

/** The client wrapper from the Next.js quickstart. */
export const Consent = ({
	children,
	state,
}: {
	children: ReactNode;
	state: ConsentRootProps['state'];
}) => (
	<ConsentRoot
		state={state}
		config={consentConfig}
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
	</ConsentRoot>
);
