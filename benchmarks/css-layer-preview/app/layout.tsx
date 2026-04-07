import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'c15t CSS Layer Preview',
	description: 'Manual side-by-side preview shell for c15t CSS layer scenarios',
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
