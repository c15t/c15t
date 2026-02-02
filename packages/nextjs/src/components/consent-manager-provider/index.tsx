import { ConsentManagerProvider as ClientConsentManagerProvider } from '@c15t/react';
import { headers } from 'next/headers';
import type {
	AppDirectoryConsentManagerProviderProps,
	InitialDataPromise,
} from '../../types';
import { enrichOptions } from './utils/enrich-options';
import { getC15TInitialData } from './utils/initial-data';

/**
 * Extended props for the server ConsentManagerProvider that supports
 * optional pre-fetched initialData.
 */
interface ServerConsentManagerProviderProps
	extends AppDirectoryConsentManagerProviderProps {
	/**
	 * Optional pre-fetched initial data.
	 * If provided, the internal fetch will be skipped.
	 * Use fetchInitialData() to obtain this value.
	 */
	initialData?: InitialDataPromise;
}

export function ConsentManagerProvider({
	children,
	options,
	initialData,
}: ServerConsentManagerProviderProps) {
	let initialDataPromise: InitialDataPromise;

	// If initialData is provided, use it; otherwise fetch internally
	if (initialData !== undefined) {
		initialDataPromise = initialData;
	} else {
		// Initial data is only required for c15t mode
		switch (options.mode) {
			case 'c15t': {
				if (!options.backendURL) {
					throw new Error('backendURL is required for c15t mode');
				}

				// In c15t mode, overrides are sent with the fetch request
				// GVL is included in the init response when server has it configured
				initialDataPromise = getC15TInitialData(options.backendURL, headers(), {
					overrides: options.overrides,
				});
				break;
			}
			default:
				initialDataPromise = undefined;
		}
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
