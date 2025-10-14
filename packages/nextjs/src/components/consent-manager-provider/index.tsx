'use server';

import {
	ConsentManagerProvider as ClientConsentManagerProvider,
	type ConsentManagerProviderProps,
} from '@c15t/react';
import { headers } from 'next/headers';
import type {
	AppDirectoryConsentManagerProviderProps,
	InitialDataPromise,
} from '../../types';
import { enrichOptions } from './utils/enrich-options';
import { getC15TInitialData } from './utils/initial-data';

export function ConsentManagerProvider({
	children,
	options,
}: AppDirectoryConsentManagerProviderProps) {
	let initialDataPromise: InitialDataPromise;

	// Initial data is only required for c15t mode
	switch (options.mode) {
		case 'c15t': {
			if (!options.backendURL) {
				throw new Error('backendURL is required for c15t mode');
			}

			initialDataPromise = getC15TInitialData(options.backendURL, headers());
			break;
		}
		default:
			initialDataPromise = undefined;
	}

	return (
		<ClientConsentManagerProvider
			options={enrichOptions({
				options: options as ConsentManagerProviderProps['options'],
				initialData: initialDataPromise,
				usingAppDir: true,
			})}
		>
			{children}
		</ClientConsentManagerProvider>
	);
}
