import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { C15tPrefetch } from '@c15t/nextjs';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@c15t/nextjs/styles.css';

export const metadata: Metadata = {
	title: 'next-compat: Next 16 App Router (prefetch root)',
};

/**
 * Second root layout. `beforeInteractive` scripts are only honoured in a root
 * layout, so routes that rely on `C15tPrefetch` live under this route group.
 */
const PrefetchRootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<head>
			<C15tPrefetch backendURL={COMPAT_BACKEND_URL} />
		</head>
		<body>{children}</body>
	</html>
);

export default PrefetchRootLayout;
