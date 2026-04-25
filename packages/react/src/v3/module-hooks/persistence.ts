'use client';

import {
	createPersistence,
	type PersistenceHandle,
	type PersistenceOptions,
} from 'c15t/v3/modules/persistence';
import { useEffect, useState } from 'react';
import { useRequiredKernel } from './shared';

export interface UsePersistenceOptions
	extends Omit<PersistenceOptions, 'kernel'> {}

export function usePersistence(
	options: UsePersistenceOptions = {}
): PersistenceHandle {
	const kernel = useRequiredKernel();
	const [handle] = useState(() =>
		createPersistence({
			kernel,
			storageConfig: options.storageConfig,
			skipHydration: true,
		})
	);

	const shouldHydrate = options.skipHydration !== true;
	useEffect(() => {
		if (shouldHydrate) handle.hydrate();
	}, [handle, shouldHydrate]);

	useEffect(() => {
		return () => handle.dispose();
	}, [handle]);

	return handle;
}

export type { PersistenceHandle, PersistenceOptions };
