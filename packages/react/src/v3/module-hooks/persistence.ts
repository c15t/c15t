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
	// Hydrate inside the lazy initializer so stored consent lands in the
	// kernel before the first render reads from it. Deferring to useEffect
	// causes a brief flash of "default consent" for returning visitors.
	const [handle] = useState(() => {
		const created = createPersistence({
			kernel,
			storageConfig: options.storageConfig,
			skipHydration: true,
		});
		if (options.skipHydration !== true) {
			created.hydrate();
		}
		return created;
	});

	useEffect(() => {
		return () => handle.dispose();
	}, [handle]);

	return handle;
}

export type { PersistenceHandle, PersistenceOptions };
