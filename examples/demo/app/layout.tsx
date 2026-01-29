import { Analytics } from '@vercel/analytics/next';
import { Geist, Geist_Mono } from 'next/font/google';
import type React from 'react';
import './globals.css';
import { ConsentManager } from '../components/consent-manager';

const _geist = Geist({ subsets: ['latin'] });
const _geistMono = Geist_Mono({ subsets: ['latin'] });

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
		<html lang="en">
			{/* <body className={`font-sans antialiased ${spaceGrotesk.variable} ${inter.variable} ${dmSans.variable}`}> */}
			<body className={`font-sans antialiased`}>
				<ConsentManager>
					{children}
					<Analytics />
				</ConsentManager>
			</body>
		</html>
	);
}
