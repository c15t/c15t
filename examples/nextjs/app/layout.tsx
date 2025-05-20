import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/nextjs';
import type { ReactNode } from 'react';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'c15t + Next.js',
	description: 'How @c15t/nextjs works with Next.js',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ConsentManagerProvider
					options={{
						mode: 'c15t',
						backendURL: process.env.NEXT_PUBLIC_C15T_URL ?? '',
					}}
				>
					<CookieBanner />
					<ConsentManagerDialog />
					{children}
				</ConsentManagerProvider>
			</body>
		</html>
	);
}
