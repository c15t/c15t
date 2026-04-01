import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'c15t Next.js Browser Bench',
	description: 'Deterministic browser benchmarks for @c15t/nextjs',
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
