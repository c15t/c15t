import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

/*
 * If you're using Next.js, we recommend installing the @c15t/nextjs package.
 * The Next.js package is a wrapper around the React package that provides
 * additional features for Next.js.
 */

import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/react';
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
	title: 'c15t + React',
	description: 'How @c15t/react works with React',
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
				/*
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
