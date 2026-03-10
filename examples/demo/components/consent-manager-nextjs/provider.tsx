'use client';

import {
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentManagerProps,
	ConsentManagerProvider,
	IABConsentBanner,
	IABConsentDialog,
} from '@c15t/nextjs';
import { baseTranslations } from '@c15t/translations/all';
import CookieBanner from './cookie-banner';

export default function ({ children, ssrData }: ConsentManagerProps) {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				// ssrData,
				// backendURL: '/api/self-host',
				consentCategories: ['necessary', 'marketing', 'measurement'],
				iab: {
					enabled: false,
					cmpId: 2,
					customVendors: [
						{
							id: 'internal-analytics',
							name: 'Example Analytics',
							privacyPolicyUrl: 'https://www.google.com',
							purposes: [1, 8],
							dataCategories: [1, 2, 6, 8],
							usesCookies: true,
							cookieMaxAgeSeconds: 31536000,
							usesNonCookieAccess: true,
							specialFeatures: [1, 2],
							// legIntPurposes: [1, 8],
						},
					],
				},
				overrides: { country: 'GB', region: 'CA' },

				scripts: [
					{
						id: 'example-analytics-iab',
						src: 'https://www.example.com/analytics.js',
						category: 'measurement',
						vendorId: 1,
					},
					{
						id: 'example-analytics-custom',
						src: 'https://www.example.com/custom-analytics.js',
						category: 'measurement',
						vendorId: 'internal-analytics',
					},
				],
				storageConfig: {
					crossSubdomain: true,
				},
				legalLinks: {
					privacyPolicy: {
						href: '/legal/privacy-policy',
					},
					termsOfService: {
						href: '/legal/terms-of-service',
					},
				},
				user: {
					id: '123',
					identityProvider: 'custom',
				},
				i18n: {
					messages: {
						zh: {
							...baseTranslations.zh,
						},
						en: {
							...baseTranslations.en,
						},
						fr: {
							...baseTranslations.fr,
						},
						de: {
							...baseTranslations.de,
						},
					},
				},
			}}
		>
			<CookieBanner />
			<ConsentDialog />
			<IABConsentBanner />
			<IABConsentDialog />
			<ConsentDialogTrigger />
			{children}
		</ConsentManagerProvider>
	);
}
