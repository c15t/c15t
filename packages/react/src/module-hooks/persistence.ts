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
	const [handle, setHandle] = useState(() =>
		createPersistence({
			kernel,
			now: options.now,
			skipHydration: true,
			storageConfig: options.storageConfig,
		})
	);
	void setHandle;
	useEffect(() => {
		if (options.skipHydration !== true) {
			handle.hydrate();
		}
		return () => handle.dispose();
	}, [handle, options.skipHydration]);

	return handle;
};

export type { PersistenceHandle, PersistenceOptions };
