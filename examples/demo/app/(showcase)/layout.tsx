import {
	DM_Sans,
	Geist,
	Geist_Mono,
	Inter,
	Space_Grotesk,
} from 'next/font/google';
import type React from 'react';
import '../globals.css';

const _geist = Geist({ subsets: ['latin'] });
const _geistMono = Geist_Mono({ subsets: ['latin'] });

const spaceGrotesk = Space_Grotesk({
	subsets: ['latin'],
	variable: '--font-space-grotesk',
	display: 'swap',
});
const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
	display: 'swap',
});
const dmSans = DM_Sans({
	subsets: ['latin'],
	variable: '--font-dm-sans',
	display: 'swap',
});

export default function ShowcaseLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`font-sans antialiased ${spaceGrotesk.variable} ${inter.variable} ${dmSans.variable}`}
			>
				{children}
			</body>
		</html>
	);
}
