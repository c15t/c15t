import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { ConsentManager } from './ConsentManager';
import { ThemeSwitcher } from './ThemeSwitcher';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'c15t with Next.js',
	description: 'Learn how to use c15t with Next.js',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable}`}>
				<ConsentManager>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem={true}
					>
						<ThemeSwitcher />
						{children}
					</ThemeProvider>
				</ConsentManager>
			</body>
		</html>
	);
}
