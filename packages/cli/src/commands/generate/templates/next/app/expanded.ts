/**
 * Expanded component templates for Next.js App Router
 * Generates more verbose, fully customizable components
 */

export function generateExpandedConsentManagerTemplate(
	optionsText: string
): string {
	return `import type { ReactNode } from 'react';
import {
	ConsentManagerProvider,
	CookieBannerRoot,
	CookieBannerCard,
	CookieBannerHeader,
	CookieBannerTitle,
	CookieBannerDescription,
	CookieBannerFooter,
	ConsentButton,
	ConsentManagerDialog,
} from '@c15t/nextjs';
import { ConsentManagerClient } from './consent-manager.client';

/**
 * Fully customizable Consent Management wrapper for Next.js
 * 
 * This component is generated in "expanded" mode, giving you direct
 * access to the component structure. You can add your own classes,
 * reorder elements, or add custom components.
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	return (
		<ConsentManagerProvider
			options={${optionsText}}
		>
			<CookieBannerRoot className="fixed bottom-4 left-4 right-4 z-50">
				<CookieBannerCard className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6">
					<CookieBannerHeader>
						<CookieBannerTitle className="text-xl font-bold text-gray-900 dark:text-white">
							We value your privacy
						</CookieBannerTitle>
						<CookieBannerDescription className="text-gray-600 dark:text-gray-400 mt-2">
							We use cookies to enhance your experience. By clicking "Accept All", 
							you agree to our use of cookies.
						</CookieBannerDescription>
					</CookieBannerHeader>
					
					<CookieBannerFooter className="mt-6 flex flex-wrap gap-3">
						<ConsentButton 
							action="reject-consent" 
							closeCookieBanner
							className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
						>
							Reject All
						</ConsentButton>
						
						<ConsentButton 
							action="accept-consent" 
							closeCookieBanner
							className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
						>
							Accept All
						</ConsentButton>
						
						<ConsentButton 
							action="open-consent-dialog"
							className="px-4 py-2 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
						>
							Customize Preferences
						</ConsentButton>
					</CookieBannerFooter>
				</CookieBannerCard>
			</CookieBannerRoot>

			<ConsentManagerDialog />
			
			<ConsentManagerClient>{children}</ConsentManagerClient>
		</ConsentManagerProvider>
	);
}
`;
}
