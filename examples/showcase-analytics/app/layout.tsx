import { ConsentTheme } from 'c15t/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { CartProvider } from '@/components/cart';
import { Consent } from '@/components/consent';
import { RevocationNotice } from '@/components/revocation-notice';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { brandTheme } from '@/lib/consent-theme';

import './globals.css';

export const metadata: Metadata = {
	description:
		'Small-batch coffee from Northwind Coffee Roasters, roasted twice a week.',
	title: 'Shop coffee | Northwind Coffee',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			{/* Renders the theme tokens into the server HTML, so the banner has
			    Northwind's colors on first paint. */}
			<ConsentTheme theme={brandTheme} />
			<Consent>
				<CartProvider>
					<SiteHeader />
					<RevocationNotice />
					{children}
					<SiteFooter />
				</CartProvider>
			</Consent>
		</body>
	</html>
);

export default RootLayout;
