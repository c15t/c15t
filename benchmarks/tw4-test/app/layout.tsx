import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
	description: 'Manual CSS review harness for Tailwind CSS 4 and c15t',
	title: 'TW4 + c15t CSS Layer Test',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
};

export default RootLayout;
