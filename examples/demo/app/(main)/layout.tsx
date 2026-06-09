import { Analytics } from '@vercel/analytics/next';
import { GeistMono } from 'geist/font/mono';
import { GeistPixelSquare } from 'geist/font/pixel';
import { GeistSans } from 'geist/font/sans';
import type React from 'react';
import '../globals.css';
import { ThemeProvider } from '../../components/theme-provider';

export const metadata = {
	title: 'c15t Demo',
	description:
		'Interactive demo of c15t consent management: policy scenarios, IAB TCF, theming, and i18n.',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} font-sans antialiased`}
			>
				<ThemeProvider defaultTheme="light" enableSystem>
					{children}
					<Analytics />
				</ThemeProvider>
			</body>
		</html>
	);
}
