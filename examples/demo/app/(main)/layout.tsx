import { Analytics } from '@vercel/analytics/next';
import { GeistMono } from 'geist/font/mono';
import {
	GeistPixelCircle,
	GeistPixelGrid,
	GeistPixelLine,
	GeistPixelSquare,
	GeistPixelTriangle,
} from 'geist/font/pixel';
import { GeistSans } from 'geist/font/sans';
import type React from 'react';

import '../globals.css';
import { ConsentManager } from '../../components/consent-manager/provider';
import { ThemeProvider } from '../../components/theme-provider';

export const metadata = {
	description:
		'Interactive demo of c15t consent management: policy scenarios, IAB TCF, theming, and i18n.',
	title: 'c15t Demo',
};

const RootLayout = ({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) => (
	<html
		lang="en"
		suppressHydrationWarning
	>
		<body
			className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelCircle.variable} ${GeistPixelTriangle.variable} ${GeistPixelLine.variable} font-sans antialiased`}
		>
			<ThemeProvider
				defaultTheme="light"
				enableSystem
			>
				<ConsentManager>
					{children}
					<Analytics />
				</ConsentManager>
			</ThemeProvider>
		</body>
	</html>
);

export default RootLayout;
