import type { Metadata } from 'next';
import './globals.css';
import '@c15t/nextjs/styles.css';

export const metadata: Metadata = {
	title: 'No-TW + c15t CSS Test',
	description: 'Verifies @layer c15t works without any CSS framework',
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
