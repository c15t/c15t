import type { ReactNode } from 'react';

import { Consent } from '@/components/consent';

import '@/styles/globals.css';

// No resolveConsent: the browser resolves consent, so pages can be static.
const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<Consent state={{}}>{children}</Consent>
		</body>
	</html>
);

export default RootLayout;

export { metadata } from '@/lib/metadata';
