// #region docs:consent
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	hosted,
} from 'c15t/react';
import type { ReactNode } from 'react';

import { scripts } from './scripts';
// #hide docs
import { testBackend } from './test-backend';
// #endhide docs

import 'c15t/react/styles.css';

const mode = hosted({
	url: 'https://your-project.inth.app',
	// #hide docs
	...testBackend('url'),
	// #endhide docs
});

export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentProvider options={{ mode, scripts }}>
		{children}
		<ConsentBanner />
		<ConsentDialog />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentProvider>
);
// #endregion docs:consent
