import { ConsentManagerProvider as ClientConsentManagerProvider } from '@c15t/react';
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

			// Extract IAB config from store options
			const iabConfig = options.store?.iab;

			// In c15t mode, overrides and IAB config are sent with the fetch request
			// Both init and GVL are fetched in parallel when IAB is enabled
			initialDataPromise = getC15TInitialData(options.backendURL, headers(), {
				overrides: options.overrides,
				iab: iabConfig
					? {
							enabled: iabConfig.enabled,
							vendors: iabConfig.vendors,
						}
					: undefined,
			});
			break;
		}
		default:
			initialDataPromise = undefined;
	}

	// enrichOptions handles the overrides logic:
	// - In c15t mode (when initialData exists), it sets overrides to undefined
	//   (since they're already used in the fetch above)
	// - In other modes (offline/custom), it passes overrides through to the client component
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
