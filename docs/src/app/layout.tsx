import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { PostHogProvider } from './posthog-provider';

const inter = Inter({
	subsets: ['latin'],
});

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body className="flex min-h-screen flex-col">
				<RootProvider>
					<PostHogProvider>{children}</PostHogProvider>
				</RootProvider>
			</body>
		</html>
	);
}
