import type { ContractsOutputs } from '@c15t/backend';
import {
	ConsentManagerProvider as ClientConsentManagerProvider,
	type ConsentManagerProviderProps,
} from '@c15t/react';
import { headers } from 'next/headers';

type InitialData = Promise<
	ContractsOutputs['consent']['showBanner'] | undefined
>;

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

async function getC15TInitialData(backendURL: string): InitialData {
	const headersList = await headers();

	let showConsentBanner: InitialData = Promise.resolve(undefined);

	const relevantHeaders = extractRelevantHeaders(headersList);

	// We can't fetch from the server if the headers are not present like when dynamic params is set to force-static
	// https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamicparams
	if (Object.keys(relevantHeaders).length > 0) {
		const response = await fetch(`${backendURL}/show-consent-banner`, {
			method: 'GET',
			headers: relevantHeaders,
		});

		showConsentBanner = await response.json();
	}

	return showConsentBanner;
}

export function ConsentManagerProvider({
	children,
	options,
}: ConsentManagerProviderProps) {
	let initialDataPromise: InitialData;

	// Initial data is currently only available in c15t mode
	switch (options.mode) {
		case 'c15t':
			initialDataPromise = getC15TInitialData(options.backendURL);
			break;
		default: {
			initialDataPromise = Promise.resolve(undefined);
		}
	}

	const promise = async () => {
		const initialData = await initialDataPromise;
		return initialData;
	};

	promise();

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
