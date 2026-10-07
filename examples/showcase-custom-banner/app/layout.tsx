import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Consent } from '@/components/consent';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

import './globals.css';

export const metadata: Metadata = {
	description:
		'Huila Pink Bourbon from Northwind Coffee Roasters. Roasted Tuesdays and Fridays.',
	title: 'Huila Pink Bourbon | Northwind Coffee',
};

// Lets the consent sheet and footer pad for the home indicator on phones.
export const viewport: Viewport = { viewportFit: 'cover' };

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<Consent>
				<SiteHeader />
				{children}
				<SiteFooter />
			</Consent>
		</body>
	</html>
);

export default RootLayout;
