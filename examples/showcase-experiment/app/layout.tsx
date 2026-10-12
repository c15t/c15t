import { ConsentTheme } from 'c15t/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Consent } from '@/components/consent';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { brandTheme } from '@/lib/consent-theme';

import './globals.css';

export const metadata: Metadata = {
	description:
		'Small-batch coffee roasted twice a week in Portland and shipped within a day.',
	title: 'Northwind Coffee',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html lang="en">
		<body>
			<ConsentTheme theme={brandTheme} />
			<Consent>
				<SiteHeader />
				<main id="main">{children}</main>
				<SiteFooter />
			</Consent>
		</body>
	</html>
);

export default RootLayout;
