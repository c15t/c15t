import { C15TDevTools } from '@c15t/dev-tools';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/react';
import { RootProvider } from 'fumadocs-ui/provider';
import { Fira_Mono, Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { manager } from '~/c15t-client';
import { cn } from '~/lib/cn';

import { PostHogProvider } from './posthog-provider';
import { SandPackCSS } from './styles/sandpack-styles';

import './styles/global.css';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
});

const firaMono = Fira_Mono({
	subsets: ['latin'],
	weight: ['400', '500', '700'],
	variable: '--font-fira-mono',
});

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			className={cn(inter.variable, firaMono.variable)}
			suppressHydrationWarning
		>
			<head>
				<SandPackCSS />
			</head>
			<body className="flex min-h-screen flex-col">
				<PostHogProvider>
					<RootProvider>
						<ConsentManagerProvider options={manager}>
							<CookieBanner />
							<ConsentManagerDialog />
							{process.env.NODE_ENV === 'development' && <C15TDevTools />}
							{children}
						</ConsentManagerProvider>
					</RootProvider>
				</PostHogProvider>
			</body>
		</html>
	);
}
