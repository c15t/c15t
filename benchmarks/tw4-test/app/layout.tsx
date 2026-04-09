import type { Metadata } from 'next';
import './globals.css';
import '@c15t/nextjs/styles.css';

export const metadata: Metadata = {
	title: 'TW4 + c15t CSS Layer Test',
	description: 'Manual CSS review harness for Tailwind CSS 4 and c15t',
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
