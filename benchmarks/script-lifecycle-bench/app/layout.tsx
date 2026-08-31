import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'c15t Script Lifecycle Bench',
	description: 'Deterministic script lifecycle benchmarks for c15t',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
};

export default RootLayout;
