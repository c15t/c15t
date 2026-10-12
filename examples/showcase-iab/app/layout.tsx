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
		'Fresh coffee needs a few days before it brews well. How long to rest each roast, and how to tell when a bag is ready.',
	title: 'How long should coffee rest after roasting? | Northwind Journal',
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
