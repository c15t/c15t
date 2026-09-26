import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { ReactNode } from 'react';

import './globals.css';
import { ServerConsent } from './server-consent';

export const metadata: Metadata = {
	description: 'Packed-artifact c15t consumer for production benchmarks',
	title: 'c15t production consumer',
};

/**
 * Mirrors the documentation site that exposed the alpha.2 regressions: the
 * page renders inside a `Suspense` boundary while the server awaits consent
 * resolution, so the shell and the consent-dependent content can arrive in
 * different HTML chunks.
 */
const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<Suspense fallback={null}>
				<ServerConsent>{children}</ServerConsent>
			</Suspense>
		</body>
	</html>
);

export default RootLayout;
