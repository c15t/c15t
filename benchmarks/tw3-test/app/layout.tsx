import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
	description: 'Verifies @layer components works with Tailwind CSS 3',
	title: 'TW3 + c15t CSS Test',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
	<html lang="en">
		<body>{children}</body>
	</html>
);

export default RootLayout;
