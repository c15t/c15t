import type { Metadata } from 'next';
import '@c15t/nextjs/styles.css';
import './globals.css';

export const metadata: Metadata = {
	title: 'TW3 + c15t CSS Test',
	description: 'Verifies @layer c15t works with Tailwind CSS 3',
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
