import type { Metadata } from 'next';

export const metadata: Metadata = {
	description: 'Deterministic browser runtime benchmarks for @c15t/react',
	title: 'c15t React Browser Bench',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
};

export default RootLayout;
