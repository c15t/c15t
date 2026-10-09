// #region docs:quickstart-layout title="app/layout.tsx"
import { resolveConsent } from 'c15t/next/server';
import type { ReactNode } from 'react';

import { consentConfig } from '@/c15t.config';
import { Consent } from '@/components/consent';

import '@/styles/globals.css';

const RootLayout = ({ children }: { children: ReactNode }) => {
	// Not awaited: the page renders while consent resolves.
	const state = resolveConsent(consentConfig);

	return (
		<html lang="en">
			<body>
				<Consent state={state}>{children}</Consent>
			</body>
		</html>
	);
};

export default RootLayout;
// #endregion docs:quickstart-layout

export const metadata = { title: 'c15t with the Next.js App Router' };
