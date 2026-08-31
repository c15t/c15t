import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'c15t React Browser Bench',
	description: 'Deterministic browser runtime benchmarks for @c15t/react',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
};

export default RootLayout;
