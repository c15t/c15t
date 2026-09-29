// #region docs:consent-wrapper
'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
} from 'c15t/next';
import type { ConsentRootProps } from 'c15t/next';
import type { ReactNode } from 'react';

import { consentConfig } from '@/c15t.config';
import { scripts } from '@/lib/scripts';

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
		scripts={scripts}
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentRoot>
);
// #endregion docs:consent-wrapper
