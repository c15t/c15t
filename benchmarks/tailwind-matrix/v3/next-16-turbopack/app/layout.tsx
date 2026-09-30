import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { Consent } from './consent';

export const metadata: Metadata = {
	title: 'c15t + Tailwind 3: Next.js 16 (Turbopack)',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<Consent>{children}</Consent>
		</body>
	</html>
);

export default RootLayout;
