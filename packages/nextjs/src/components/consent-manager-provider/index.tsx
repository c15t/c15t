import type { ContractsOutputs } from '@c15t/backend';
import {
	ConsentManagerProvider as ClientConsentManagerProvider,
	type ConsentManagerProviderProps,
	defaultTranslationConfig,
	prepareTranslationConfig,
} from '@c15t/react';
import { headers } from 'next/headers';
import { showBanner } from './show-banner';

const LOCATION_HEADERS = [
	'cf-ipcountry',
	'x-vercel-ip-country',
	'x-amz-cf-ipcountry',
	'x-country-code',
	'x-vercel-ip-country-region',
	'x-region-code',
	'accept-language',
	'user-agent',
] as const;

function extractRelevantHeaders(
	headersList: Awaited<ReturnType<typeof headers>>
): Record<string, string> {
	const relevantHeaders: Record<string, string> = {};

	for (const headerName of LOCATION_HEADERS) {
		const value = headersList.get(headerName);
		if (value) {
			relevantHeaders[headerName] = value;
		}
	}

	return relevantHeaders;
}

export async function ConsentManagerProvider({
	children,
	options,
}: ConsentManagerProviderProps) {
	const { translations: translationConfig } = options;

	// Early return if no backend URL is configured
	if (!options.backendURL) {
		const preparedTranslationConfig = prepareTranslationConfig(
			defaultTranslationConfig,
			translationConfig
		);

		return (
			<ClientConsentManagerProvider
				options={{
					...options,
					store: {
						...options.store,
						translationConfig: preparedTranslationConfig,
					},
				}}
			>
				{children}
			</ClientConsentManagerProvider>
		);
	}

	const headersList = await headers();
	let showConsentBanner: ContractsOutputs['consent']['showBanner'] | undefined;

	const relevantHeaders = extractRelevantHeaders(headersList);

	if (Object.keys(relevantHeaders).length > 0) {
		try {
			showConsentBanner = showBanner(relevantHeaders);
		} catch (error) {
			console.error('Failed to process consent banner:', {
				error: error instanceof Error ? error.message : String(error),
				headersReceived: Object.keys(relevantHeaders),
			});
		}
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
					_initialShowConsentBanner: showConsentBanner,
				},
			}}
		>
			{children}
		</ClientConsentManagerProvider>
	);
}
