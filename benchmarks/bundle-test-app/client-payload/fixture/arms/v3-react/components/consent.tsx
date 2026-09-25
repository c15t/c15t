'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	hosted,
} from 'c15t/react';
import type { ConsentProviderOptions } from 'c15t/react';
import type { ReactNode } from 'react';

import { theme } from './theme';

/**
 * The c15t docs site's shape: `ConsentProvider` from the `c15t/react`
 * umbrella entry in hosted mode, fed the server-resolved state.
 */
export const Consent = ({
	children,
	state,
}: {
	children: ReactNode;
	state: ConsentProviderOptions['prefetch'];
}) => (
	<ConsentProvider
		options={{
			mode: hosted({ url: '/mock-backend' }),
			prefetch: state,
			theme,
		}}
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
		<footer className="mx-auto max-w-3xl px-6 py-8">
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentProvider>
);
