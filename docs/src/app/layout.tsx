import './global.css';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/react';
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
					<ConsentManagerProvider
						options={{
							mode: 'offline',
							// backendURL: env.NEXT_PUBLIC_C15T_URL as string,
							store: {
								initialGdprTypes: ['necessary', 'marketing'],
							},
						}}
					>
						<PostHogProvider>{children}</PostHogProvider>
						<CookieBanner />
						<ConsentManagerDialog />
					</ConsentManagerProvider>
				</RootProvider>
			</body>
		</html>
	);
}
