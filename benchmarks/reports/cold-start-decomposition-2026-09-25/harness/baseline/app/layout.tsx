import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Suspense } from 'react';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
	description: 'Packed-artifact c15t consumer for production benchmarks',
	title: 'c15t production consumer',
};

/**
 * Baseline for the cold-start benchmark: the same layout and page with no
 * c15t code on the server or the client. The Suspense boundary stays so the
 * stream shape matches the consumer.
 */
const DynamicContent = async ({ children }: { children: ReactNode }) => {
	// Read the request like ServerConsent does, so the page renders per
	// request instead of being prerendered.
	await headers();
	return children;
};

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<Suspense fallback={null}>
				<DynamicContent>{children}</DynamicContent>
			</Suspense>
		</body>
	</html>
);

export default RootLayout;
