import type { Metadata } from 'next';

export const metadata: Metadata = {
	description: 'Deterministic browser benchmarks for @c15t/nextjs',
	title: 'c15t Next.js Browser Bench',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
	<html lang="en">
		<body>{children}</body>
	</html>
);

export default RootLayout;
