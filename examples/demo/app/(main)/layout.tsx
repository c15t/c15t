import { Analytics } from '@vercel/analytics/next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import type React from 'react';
import '../globals.css';
import { ConsentManager } from '../../components/consent-manager/provider';

const geist = Geist({
	subsets: ['latin'],
	variable: '--font-geist-sans',
});
const geistMono = Geist_Mono({
	subsets: ['latin'],
	variable: '--font-geist-mono',
});

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
				className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
			>
				<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
					<ConsentManager>
						{children}
						<Analytics />
					</ConsentManager>
				</ThemeProvider>
			</body>
		</html>
	);
}
