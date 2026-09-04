'use client';

import { createPersistence } from '@c15t/core/modules/persistence';
import type {
	PersistenceHandle,
	PersistenceOptions,
} from '@c15t/core/modules/persistence';
import { useEffect, useState } from 'react';

import { useRequiredKernel } from './shared';

export type UsePersistenceOptions = Omit<PersistenceOptions, 'kernel'>;

export const usePersistence = function usePersistence(
	options: UsePersistenceOptions = {}
): PersistenceHandle {
	const kernel = useRequiredKernel();
	// Hydrate inside the lazy initializer so stored consent lands in the
	// kernel before the first render reads from it. Deferring to useEffect
	// causes a brief flash of "default consent" for returning visitors.
	const [handle, setHandle] = useState(() => {
		const created = createPersistence({
			kernel,
			skipHydration: true,
			storageConfig: options.storageConfig,
		});
		if (options.skipHydration !== true) {
			created.hydrate();
		}
		return created;
	});
	void setHandle;

	useEffect(() => () => handle.dispose(), [handle]);

	return handle;
};

export type { PersistenceHandle, PersistenceOptions };
