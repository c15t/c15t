import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	hosted,
} from 'c15t/react';
import type { ReactNode } from 'react';

import { scripts } from './scripts';
import { testBackend } from './test-backend';

const mode = hosted({
	url: 'https://your-project.inth.app',
	...testBackend('url'),
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
