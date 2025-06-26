import {
	ConsentManagerProvider as ClientConsentManagerProvider,
	type ConsentManagerProviderProps,
} from '@c15t/react';
import packageJson from '../../../package.json';
import { getC15TInitialData } from './utils/initial-data';

type InitialDataPromise = NonNullable<
	ConsentManagerProviderProps['store']
>['_initialData'];

export function ConsentManagerProvider({
	children,
	...rest
}: ConsentManagerProviderProps) {
	let initialDataPromise: InitialDataPromise;

	const mode = rest.mode ?? rest.options?.mode;

	const backendURL = rest.backendURL ?? rest.options?.backendURL;

	// Initial data is currently only available in c15t mode
	switch (mode) {
		case 'c15t': {
			if (!backendURL) {
				throw new Error('backendURL is required in c15t mode');
			}

			initialDataPromise = getC15TInitialData(backendURL);
			break;
		}
		default: {
			initialDataPromise = Promise.resolve(undefined);
		}
	}

	return (
		<ClientConsentManagerProvider
			{...rest}
			store={{
				...rest.store,
				...rest.options?.store,
				config: {
					pkg: '@c15t/nextjs',
					version: packageJson.version,
					mode: mode ?? 'Unknown',
				},
				_initialData: initialDataPromise,
			}}
		>
			{children}
		</ClientConsentManagerProvider>
	);
}
