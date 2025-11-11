import type { ConsentManagerProviderProps } from '@c15t/react';
import type { InitialDataPromise } from '../../../types';
import { version } from '../../../version';

interface EnrichOptionsProps {
	initialData?: InitialDataPromise;
	usingAppDir?: boolean;
	options:
		| ConsentManagerProviderProps['options']
		| Omit<ConsentManagerProviderProps['options'], 'overrides'>;
}

export function enrichOptions({
	options,
	initialData,
	usingAppDir = false,
}: EnrichOptionsProps): ConsentManagerProviderProps['options'] {
	const baseStoreConfig = {
		...options.store,
		config: {
			pkg: '@c15t/nextjs',
			version,
			mode: options.mode || 'Unknown',
			meta: {
				appDirectory: usingAppDir,
			},
		},
	};

	// In c15t mode (when initialData is provided), overrides are handled by the HOC
	// so we explicitly set them to undefined
	// In other modes, overrides are passed through to the client component
	const overrides: ConsentManagerProviderProps['options']['overrides'] =
		initialData !== undefined
			? undefined
			: 'overrides' in options
				? options.overrides
				: undefined;

	// Only set _initialData if initialData is provided (c15t mode)
	if (initialData !== undefined) {
		return {
			...options,
			overrides,
			store: {
				...baseStoreConfig,
				_initialData: initialData,
			},
		} as ConsentManagerProviderProps['options'];
	}

	return {
		...options,
		overrides,
		store: baseStoreConfig,
	} as ConsentManagerProviderProps['options'];
}
