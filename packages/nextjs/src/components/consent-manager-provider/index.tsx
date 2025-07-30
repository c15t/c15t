import {
	ConsentManagerProvider as ClientConsentManagerProvider,
	type ConsentManagerProviderProps,
} from '@c15t/react';
import { headers } from 'next/headers';
import { enrichOptions } from './utils/enrich-options';
import { getC15TInitialData } from './utils/initial-data';

type InitialDataPromise = NonNullable<
	ConsentManagerProviderProps['options']['store']
>['_initialData'];

export function ConsentManagerProvider({
	children,
	options,
}: ConsentManagerProviderProps) {
	let initialDataPromise: InitialDataPromise;

	// Initial data is only required for c15t mode
	switch (options.mode) {
		case 'c15t':
			initialDataPromise = getC15TInitialData(options.backendURL, headers());
			break;
		default: {
			initialDataPromise = undefined;
		}
	}

	return (
		<ClientConsentManagerProvider
			options={enrichOptions({
				options,
				initialData: initialDataPromise,
				usingAppDir: true,
			})}
		>
			{children}
		</ClientConsentManagerProvider>
	);
}
