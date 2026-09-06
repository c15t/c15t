import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@c15t/nextjs/styles.css';

export const metadata: Metadata = {
	title: 'next-compat: Next 16 static export',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>{children}</body>
	</html>
);

export default RootLayout;
