// #region docs:quickstart-layout title="app/layout.tsx"
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
} from 'c15t/next';
import { resolveConsent } from 'c15t/next/server';
import type { ReactNode } from 'react';

import './globals.css';

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			{/* Not awaited: the page renders while consent resolves. */}
			<ConsentRoot state={resolveConsent()}>
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
// #endregion docs:quickstart-layout
