'use client';

import { hosted } from 'c15t';
import { ConsentBanner } from 'c15t/react/consent-banner';
import { ConsentDialog } from 'c15t/react/consent-dialog';
import { ConsentDialogLink } from 'c15t/react/consent-dialog-link';
import { ConsentProvider } from 'c15t/react/provider';
import type { ConsentProviderOptions } from 'c15t/react/provider';
import type { ReactNode } from 'react';

import { theme } from './theme';

/**
 * The same provider tree as the `v3-react` arm, imported from the split
 * `c15t/react/*` entry points instead of the umbrella.
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
