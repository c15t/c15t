import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
	title: 'TW3 + c15t CSS Test',
	description: 'Verifies @layer components works with Tailwind CSS 3',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
};

export default RootLayout;
