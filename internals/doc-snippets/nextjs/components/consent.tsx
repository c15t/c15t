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

import { scripts } from '@/lib/scripts';

interface ConsentProps {
	children: ReactNode;
	state?: ConsentRootProps['state'];
}

// ConsentRoot reads c15t.config.ts itself; props win over the config.
export const Consent = ({ children, state }: ConsentProps) => (
	<ConsentRoot
		state={state}
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
