import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import {
	prefetchInitialConsent,
	readInitialConsentConfig,
} from 'c15t/next/server';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import type { ReactNode } from 'react';

import { BoundaryProvider } from '@/components/demo/boundary';
import { DemoToolbar } from '@/components/demo/demo-toolbar';
import { OfflineIndicator } from '@/components/offline-indicator';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/toaster';

import { consentConfig } from '../c15t.config';
import { Consent } from '../components/consent';

export const viewport: Viewport = {
	themeColor: [
		{ color: '#fafafa', media: '(prefers-color-scheme: light)' },
		{ color: '#121212', media: '(prefers-color-scheme: dark)' },
	],
	viewportFit: 'cover',
};

export const metadata: Metadata = {
	description:
		'A Next.js 16.3 music player demonstrating Instant Navigations with ' +
		'Cache Components, App Shells, and Partial Prefetching.',
	title: {
		default: 'NextBeats',
		template: '%s · NextBeats',
	},
};

const ResolvedConsent = async ({ children }: { children: ReactNode }) => {
	// Hosted (Inth / self-hosted) path from app-router.mdx. Offline mode has no
	// server prefetch; the docs' offline example passes `config={{}}`.
	// With `cacheComponents: true`, Next 16 flags the helper's internal
	// `Date.now()` during the prerender pass ("unstable value while
	// prerendering"). Opting into request time first avoids that.
	await connection();
	const initialConsent = consentConfig
		? await prefetchInitialConsent({ config: consentConfig })
		: await readInitialConsentConfig();

	return <Consent config={initialConsent}>{children}</Consent>;
};

const RootLayout = ({ children }: { children: ReactNode }) => (
	<html
		lang="en"
		className={`${GeistSans.variable} ${GeistMono.variable}`}
		suppressHydrationWarning
	>
		<body
			className={[
				'bg-surface dark:bg-surface-dark flex h-[100dvh] flex-col',
				'text-black antialiased dark:text-white',
			].join(' ')}
		>
			<ThemeProvider>
				<BoundaryProvider>
					<Suspense fallback={null}>
						<ResolvedConsent>
							<OfflineIndicator />
							{children}
							<div
								className={[
									'demo-toggles fixed top-3 right-3 z-50 hidden',
									'items-end gap-2 sm:flex',
								].join(' ')}
							>
								<Suspense>
									<DemoToolbar />
								</Suspense>
							</div>
							<Toaster />
						</ResolvedConsent>
					</Suspense>
				</BoundaryProvider>
			</ThemeProvider>
			<Analytics />
			<SpeedInsights />
		</body>
	</html>
);

export default RootLayout;
