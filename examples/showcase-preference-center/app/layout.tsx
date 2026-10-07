import { ConsentTheme } from 'c15t/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Consent } from '@/components/consent';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { northwindTheme } from '@/lib/theme';

import './globals.css';

export const metadata: Metadata = {
	description: 'Small-batch coffee, roasted to order.',
	title: 'Northwind Coffee',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<ConsentTheme theme={northwindTheme} />
			<Consent>
				<SiteHeader />
				<main className="site-main">{children}</main>
				<SiteFooter />
			</Consent>
		</body>
	</html>
);

export default RootLayout;
