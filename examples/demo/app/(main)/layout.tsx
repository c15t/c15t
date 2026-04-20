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

// Theme preset fonts
// const spaceGrotesk = Space_Grotesk({
//   subsets: ["latin"],
//   variable: "--font-space-grotesk",
//   display: "swap",
// });
// const inter = Inter({
//   subsets: ["latin"],
//   variable: "--font-inter",
//   display: "swap",
// });
// const dmSans = DM_Sans({
//   subsets: ["latin"],
//   variable: "--font-dm-sans",
//   display: "swap",
// });

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelCircle.variable} ${GeistPixelTriangle.variable} ${GeistPixelLine.variable} font-sans antialiased`}
			>
				<ThemeProvider defaultTheme="light" enableSystem>
					<ConsentManager>
						{children}
						<Analytics />
					</ConsentManager>
				</ThemeProvider>
			</body>
		</html>
	);
}
