import type { ReactNode } from 'react';

import { Consent } from '@/components/consent';

import 'c15t/next/styles.css';

export const metadata = { title: 'Self-hosted c15t backend' };

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<Consent>{children}</Consent>
		</body>
	</html>
);

export default RootLayout;
