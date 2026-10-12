// #region docs:browser-layout title="app/layout.tsx"
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
} from 'c15t/next';
import type { ReactNode } from 'react';

import './globals.css';

// No resolveConsent: the browser resolves consent, so pages can be static.
const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<ConsentRoot>
				{children}
				<ConsentBanner />
				<ConsentDialog />
				<footer>
					<ConsentDialogLink>Privacy settings</ConsentDialogLink>
				</footer>
			</ConsentRoot>
		</body>
	</html>
);

export default RootLayout;
// #endregion docs:browser-layout
