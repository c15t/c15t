import type { ConsentManagerProviderProps } from '@c15t/react';
import { version } from '../../../version';

type InitialDataPromise = NonNullable<
	ConsentManagerProviderProps['options']['store']
>['_initialData'];

interface EnrichOptionsProps {
	initialData?: InitialDataPromise;
	usingAppDir?: boolean;
	options: ConsentManagerProviderProps['options'];
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

	// Only set _initialData if initialData is provided (c15t mode)
	if (initialData !== undefined) {
		return {
			...options,
			store: {
				...baseStoreConfig,
				_initialData: initialData,
			},
		};
	}

	return {
		...options,
		store: baseStoreConfig,
	};
}
