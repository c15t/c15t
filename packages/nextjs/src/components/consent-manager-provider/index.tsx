import type { ContractsOutputs } from '@c15t/backend/contracts';
import {
	ConsentManagerProvider as ClientConsentManagerProvider,
	type ConsentManagerProviderProps,
} from '@c15t/react';
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';
import { headers } from 'next/headers';

type InitialDataPromise = NonNullable<
	ConsentManagerProviderProps['options']['store']
>['_initialData'];

type ShowConsentBanner = ContractsOutputs['consent']['showBanner'] | undefined;

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

const ABSOLUTE_URL_REGEX = /^https?:\/\//;

function validateBackendURL(backendURL: string): {
	isAbsolute: boolean;
	normalizedURL: string;
} {
	// Check if URL is absolute (starts with protocol)
	const isAbsolute = ABSOLUTE_URL_REGEX.test(backendURL);

	if (isAbsolute) {
		try {
			const url = new URL(backendURL);
			// Ensure we only allow HTTP/HTTPS protocols for security
			if (!['http:', 'https:'].includes(url.protocol)) {
				throw new Error(`Unsupported protocol: ${url.protocol}`);
			}
			return {
				isAbsolute: true,
				normalizedURL: backendURL,
			};
		} catch {
			throw new Error(`Invalid absolute URL: ${backendURL}`);
		}
	} else {
		// Handle relative URLs - ensure they start with /
		const normalizedURL = backendURL.startsWith('/')
			? backendURL
			: `/${backendURL}`;

		return {
			isAbsolute: false,
			normalizedURL,
		};
	}
}

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

function normalizeBackendURL(
	backendURL: string,
	headersList: ReadonlyHeaders
): string | null {
	try {
		const { normalizedURL: validated, isAbsolute } =
			validateBackendURL(backendURL);

		if (isAbsolute) {
			return validated;
		}

		const referer = headersList.get('referer');
		const protocol = headersList.get('x-forwarded-proto') || 'https';
		const host = headersList.get('x-forwarded-host') || headersList.get('host');

		if (host) {
			return `${protocol}://${host}${validated}`;
		}

		if (referer) {
			return `${referer}${validated}`;
		}

		if (process.env.NODE_ENV === 'development') {
			console.warn('Could not determine base URL for relative backend URL');
		}
		return null;
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('Invalid backend URL:', error);
		}
		return null;
	}
}

async function getC15TInitialData(
	backendURL: string
): Promise<ShowConsentBanner> {
	const headersList = await headers();
	const relevantHeaders = extractRelevantHeaders(headersList);
	let showConsentBanner: Promise<ShowConsentBanner> =
		Promise.resolve(undefined);

	const normalizedURL = normalizeBackendURL(backendURL, headersList);

	if (!normalizedURL) {
		return showConsentBanner;
	}

	// We can't fetch from the server if the headers are not present like when dynamic params is set to force-static
	// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamicparams
	try {
		if (Object.keys(relevantHeaders).length > 0) {
			const response = await fetch(`${normalizedURL}/show-consent-banner`, {
				method: 'GET',
				headers: relevantHeaders,
			});

			if (response.ok) {
				showConsentBanner = await response.json();
			}
		}
	} catch {
		return showConsentBanner;
	}

	return showConsentBanner;
}

export function ConsentManagerProvider({
	children,
	options,
}: ConsentManagerProviderProps) {
	let initialDataPromise: InitialDataPromise;

	// Initial data is currently only available in c15t mode
	switch (options.mode) {
		case 'c15t':
			initialDataPromise = getC15TInitialData(options.backendURL);
			break;
		default: {
			initialDataPromise = Promise.resolve(undefined);
		}
	}

	return (
		<ClientConsentManagerProvider
			options={{
				...options,
				store: {
					...options.store,
					_initialData: initialDataPromise,
				},
			}}
		>
			{children}
		</ClientConsentManagerProvider>
	);
}
