import type { Metadata } from 'next';

export const metadata: Metadata = {
	description: 'Testing c15t bundle sizes with different import patterns',
	title: 'Bundle Test App',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
	<html lang="en">
		<body>{children}</body>
	</html>
);

export default RootLayout;
