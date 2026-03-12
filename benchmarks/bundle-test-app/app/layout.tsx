import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Bundle Test App',
	description: 'Testing c15t bundle sizes with different import patterns',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
