import {
	ConsentManagerProvider as ClientConsentManagerProvider,
	type ConsentManagerProviderProps,
} from '@c15t/react';
import packageJson from '../../../package.json';
import { getC15TInitialData } from './utils/initial-data';

type InitialDataPromise = NonNullable<
	ConsentManagerProviderProps['options']['store']
>['_initialData'];

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
					config: {
						pkg: '@c15t/nextjs',
						version: packageJson.version,
						mode: options.mode || 'Unknown',
					},
					_initialData: initialDataPromise,
				},
			}}
		>
			{children}
		</ClientConsentManagerProvider>
	);
}
