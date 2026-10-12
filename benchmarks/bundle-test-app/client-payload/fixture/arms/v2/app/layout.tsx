import type { ReactNode } from 'react';

import { ConsentManager } from '../components/consent-manager';

import './globals.css';

/** The v2 Next.js quickstart: a client provider mounted at the root. */
const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<ConsentManager>{children}</ConsentManager>
		</body>
	</html>
);

export default RootLayout;
