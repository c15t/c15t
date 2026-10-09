// #region docs:app-router-layout title="app/layout.tsx"
import { resolveConsent } from 'c15t/next/server';
import type { ReactNode } from 'react';

import { consentOptions } from '@/c15t.server';
import { Consent } from '@/components/consent';

import '@/styles/globals.css';

const RootLayout = ({ children }: { children: ReactNode }) => {
	// Not awaited: the page renders while consent resolves.
	const state = resolveConsent(consentOptions);

	return (
		<html lang="en">
			<body>
				<Consent state={state}>{children}</Consent>
			</body>
		</html>
	);
};

export default RootLayout;
// #endregion docs:app-router-layout
