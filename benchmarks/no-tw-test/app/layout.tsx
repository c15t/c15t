import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
	description: 'Verifies @layer components works without any CSS framework',
	title: 'No-TW + c15t CSS Test',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
};

export default RootLayout;
