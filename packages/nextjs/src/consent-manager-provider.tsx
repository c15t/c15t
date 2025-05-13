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
import { SetCookies } from './cookies';

// Todo: remove cookies??

export async function ConsentManagerProvider({
	children,
	options,
}: ConsentManagerProviderProps) {
	const { translations: translationConfig } = options;

	const cookieStore = await cookies();
	const headersList = await headers();

	const showConsentCookie = cookieStore.get('show-consent-banner');
	let showConsentBanner: ContractsOutputs['consent']['showBanner'] | null =
		null;

	if (options.backendURL && !showConsentCookie) {
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
		defaultTranslationConfig,
		translationConfig
	);

	// We need to set the cookies before rendering the consent manager provider
	// We display in Offline mode as soon as the cookie is not set
	if (!showConsentCookie) {
		return (
			<SetCookies
				cookies={{
					'show-consent-banner': JSON.stringify(showConsentBanner),
				}}
			>
				<ClientConsentManagerProvider
					options={{
						mode: 'offline',
						callbacks: options.callbacks,
						store: options.store,
						translations: options.translations,
						react: options.react,
					}}
					_translationConfig={preparedTranslationConfig}
				>
					{children}
				</ClientConsentManagerProvider>
			</SetCookies>
		);
	}

	// Pass all necessary data to the client component
	return (
		<ClientConsentManagerProvider
			options={options}
			_translationConfig={preparedTranslationConfig}
		>
			{children}
		</ClientConsentManagerProvider>
	);
}
