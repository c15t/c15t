import type { ContractsOutputs } from '@c15t/backend/contracts';
import { c15tClient } from '@c15t/node-sdk';
import {
	ConsentManagerProvider as ClientConsentManagerProvider,
	type ConsentManagerProviderProps,
	defaultTranslationConfig,
	prepareTranslationConfig,
} from '@c15t/react';
import { headers } from 'next/headers';
import { cookies } from 'next/headers';

export async function ConsentManagerProvider({
	children,
	options,
}: ConsentManagerProviderProps) {
	const { translations: translationConfig } = options;

	const cookieStore = await cookies();
	const headersList = await headers();

	const showConsentCookie = cookieStore.get('show-consent-banner');
	let showConsentBanner: ContractsOutputs['consent']['showBanner'] | undefined;

	// Parse the cookie value if it exists
	if (showConsentCookie?.value) {
		try {
			showConsentBanner = JSON.parse(showConsentCookie.value);
		} catch (e) {
			console.error('Failed to parse show-consent-banner cookie:', e);
		}
	}

	// Only fetch from backend if no cookie exists and backendURL is provided
	if (!showConsentBanner && options.backendURL) {
		const forwardedHeaders: Record<string, string | null> = {
			'user-agent': headersList.get('user-agent'),
			'accept-language': headersList.get('accept-language'),
			'cf-ipcountry': headersList.get('cf-ipcountry'),
			'x-vercel-ip-country': headersList.get('x-vercel-ip-country'),
			'x-amz-cf-ipcountry': headersList.get('x-amz-cf-ipcountry'),
			'x-country-code': headersList.get('x-country-code'),
			'x-vercel-ip-country-region': headersList.get(
				'x-vercel-ip-country-region'
			),
			'x-region-code': headersList.get('x-region-code'),
		};

		const filteredHeaders = Object.fromEntries(
			Object.entries(forwardedHeaders).filter(([_, value]) => value !== null)
		) as Record<string, string>;

		const client = c15tClient({
			baseUrl: options.backendURL ?? ' ',
			headers: filteredHeaders,
		});

		showConsentBanner = await client.consent.showBanner();
	}

	// Prepare translation config
	const preparedTranslationConfig = prepareTranslationConfig(
		showConsentBanner
			? {
					translations: {
						[showConsentBanner.translations.language]:
							showConsentBanner.translations.translations,
					},
					disableAutoLanguageSwitch: true,
					defaultLanguage: showConsentBanner.translations.language,
				}
			: defaultTranslationConfig,
		translationConfig
	);

	// Pass all necessary data to the client component
	return (
		<ClientConsentManagerProvider
			options={{
				...options,
				store: {
					...options.store,
					translationConfig: preparedTranslationConfig,
					_initialShowConsentBanner: showConsentCookie
						? undefined
						: showConsentBanner,
				},
			}}
		>
			{children}
		</ClientConsentManagerProvider>
	);
}
