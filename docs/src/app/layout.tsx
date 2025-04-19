import './global.css';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/react';
import { c15tConfig } from 'c15t.config';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { PostHogProvider } from './posthog-provider';

// Define theme colors as variables for consistency

const inter = Inter({
	subsets: ['latin'],
});

export default function Layout({ children }: { children: ReactNode }) {
	const bgColor = '#FFFFFF';
	const bgColorDark = '#000000';
	const primaryColor = 'hsl(172 72.2% 48%)';
	const primaryColorHover = 'hsl(172deg 72% 48% / 0.1)';
	const focusRing = `${primaryColor} !important`;
	const focusShadow = `0 0 0 2px ${primaryColor}`;

	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body className="flex min-h-screen flex-col">
				<RootProvider>
					<ConsentManagerProvider options={c15tConfig}>
						<PostHogProvider>{children}</PostHogProvider>
						<CookieBanner
							theme={{
								'banner.root': {
									style: {
										'--banner-background-color-dark': '#000000',
										'--banner-footer-background-color-dark': '#000000',
										'--button-primary-hover-dark': primaryColorHover,
										'--button-primary-hover': primaryColorHover,
										'--button-background-color-dark': bgColorDark,
										'--button-background-color': bgColor,
										'--button-focus-ring-dark': `${primaryColor} !important`,
										'--button-focus-ring': `${primaryColor} !important`,
										'--button-primary-dark': primaryColor,
										'--button-primary': primaryColor,
										'--button-shadow-primary-dark': `var(--button-shadow-dark), inset 0 0 0 1px ${primaryColor}`,
										'--button-shadow-primary-focus-dark': focusShadow,
										'--button-shadow-primary-focus': focusShadow,
										'--button-shadow-primary': `var(--button-shadow), inset 0 0 0 1px ${primaryColor}`,
									},
								},
							}}
						/>
						<ConsentManagerDialog
							theme={{
								'dialog.root': {
									style: {
										'--dialog-background-color-dark': bgColorDark,
										'--dialog-footer-background-color-dark': bgColorDark,
										'--button-focus-ring-dark': `${primaryColor} !important`,
										'--button-focus-ring': `${primaryColor} !important`,
										'--button-primary-dark': primaryColor,
										'--button-primary': primaryColor,
										'--button-shadow-primary-dark': `var(--button-shadow-dark), inset 0 0 0 1px ${primaryColor}`,
										'--button-shadow-primary-focus-dark': focusShadow,
										'--button-shadow-primary-focus': focusShadow,
										'--button-shadow-primary': `var(--button-shadow), inset 0 0 0 1px ${primaryColor}`,
										'--accordion-focus-ring-dark': focusRing,
										'--accordion-focus-ring': focusRing,
										'--accordion-focus-shadow-dark': focusShadow,
										'--accordion-focus-shadow': focusShadow,
										'--button-primary-hover-dark': primaryColorHover,
										'--dialog-branding-focus-color-dark': `var(--button-shadow), inset 0 0 0 1px ${primaryColor}`,
										'--switch-focus-shadow-dark': focusShadow,
										'--switch-background-color-checked-dark': primaryColor,
										'--switch-background-color-checked': primaryColor,
										'--switch-background-color-unchecked-dark': bgColorDark,
										'--switch-background-color-unchecked': bgColor,
										'--widget-accordion-background-color-dark': bgColorDark,
										'--widget-accordion-background-color': bgColor,
									},
								},
							}}
						/>
					</ConsentManagerProvider>
				</RootProvider>
			</body>
		</html>
	);
}
