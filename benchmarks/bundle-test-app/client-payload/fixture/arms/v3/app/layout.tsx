import { resolveConsent } from 'c15t/next/server';
import { Suspense } from 'react';
import type { ReactNode } from 'react';

import { consentConfig } from '../c15t.config';
import { Consent } from '../components/consent';

import './globals.css';

/** The v3 App Router guide: await consent on the server inside Suspense. */
const ResolvedConsent = async ({ children }: { children: ReactNode }) => {
	const state = await resolveConsent({ config: consentConfig });

	return <Consent state={state}>{children}</Consent>;
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
