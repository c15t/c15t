import type { ReactNode } from 'react';

import 'c15t/next/styles.css';
import './styles.css';

export const metadata = {
	description: 'Try consent-gated video, analytics and preferences in Next.js.',
	title: 'Consent example · c15t',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>{children}</body>
	</html>
);

export default RootLayout;
