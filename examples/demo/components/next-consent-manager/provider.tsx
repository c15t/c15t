'use client';
import {
	ConsentManagerProps,
	ConsentManagerProvider,
	IABBanner,
	IABPreferenceCenter,
	PreferenceCenterTrigger,
} from '@c15t/nextjs';
import { baseTranslations } from '@c15t/translations';
import type { ReactNode } from 'react';
import CookieBanner from './cookie-banner';

export default function ({ children, initialData }: ConsentManagerProps) {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'c15t',
				ssrData: initialData,
				backendURL: '/api/self-host',
				// backendURL: 'https://minecraft-europe-hypixel.c15t.xyz',
				consentCategories: ['necessary', 'marketing', 'measurement'],
				iab: {
					enabled: true,
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
				translations: {
					translations: {
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
			<IABBanner />
			<IABPreferenceCenter />
			<PreferenceCenterTrigger />
			{children}
		</ConsentManagerProvider>
	);
}
