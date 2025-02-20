import './styles/global.css';
import { C15TDevTools } from '@c15t/dev-tools';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
	type CookieBannerTheme,
} from '@c15t/react';
import { cn } from '@c15t/shadcn/libs';
import { RootProvider } from 'fumadocs-ui/provider';
import { Fira_Mono, Inter } from 'next/font/google';
import type { ReactNode } from 'react';

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
	const _theme: CookieBannerTheme = {
		'cookie-banner.footer.reject-button': {
			style: {
				backgroundColor: 'red',
				color: 'blue',
			},
		},
		'cookie-banner.footer.customize-button': 'default-style',
		'cookie-banner.footer.accept-button': 'default-style',
		'cookie-banner.overlay': 'default-style',
	};

	type x = CookieBannerTheme;

	return (
		<html
			lang="en"
			className={cn(inter.variable, firaMono.variable)}
			suppressHydrationWarning
		>
			<body className="flex min-h-screen flex-col">
				<RootProvider>
					<ConsentManagerProvider initialGdprTypes={['necessary', 'marketing']}>
						<CookieBanner
							theme={{
								'cookie-banner.footer.reject-button': {
									style: {},
								},
							}}
						/>
						<ConsentManagerDialog />
						{process.env.NODE_ENV === 'development' && <C15TDevTools />}
						{children}
					</ConsentManagerProvider>
				</RootProvider>
			</body>
		</html>
	);
}
