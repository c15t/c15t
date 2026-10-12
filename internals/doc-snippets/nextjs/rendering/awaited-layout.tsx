// #region docs:app-router-awaited-layout title="app/layout.tsx"
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
} from 'c15t/next';
import { resolveConsent } from 'c15t/next/server';
import { Suspense } from 'react';
import type { ReactNode } from 'react';

import './globals.css';

const ResolvedConsent = async ({ children }: { children: ReactNode }) => {
	const state = await resolveConsent();

	return (
		<ConsentRoot state={state}>
			{children}
			<ConsentBanner />
			<ConsentDialog />
			<footer>
				<ConsentDialogLink>Privacy settings</ConsentDialogLink>
			</footer>
		</ConsentRoot>
	);
};

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<Suspense fallback={null}>
				<ResolvedConsent>{children}</ResolvedConsent>
			</Suspense>
		</body>
	</html>
);

export default RootLayout;
// #endregion docs:app-router-awaited-layout
