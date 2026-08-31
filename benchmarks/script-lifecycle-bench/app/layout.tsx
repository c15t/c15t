import type { Metadata } from 'next';

export const metadata: Metadata = {
	description: 'Deterministic script lifecycle benchmarks for c15t',
	title: 'c15t Script Lifecycle Bench',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
};

export default RootLayout;
