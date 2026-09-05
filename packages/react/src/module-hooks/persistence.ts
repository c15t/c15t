'use client';

import { createPersistence } from '@c15t/core/modules/persistence';
import type {
	PersistenceHandle,
	PersistenceOptions,
} from '@c15t/core/modules/persistence';
import { useEffect, useRef, useState } from 'react';

import { useRequiredKernel } from './shared';

export type UsePersistenceOptions = Omit<PersistenceOptions, 'kernel'>;

export const usePersistence = function usePersistence(
	options: UsePersistenceOptions = {}
): PersistenceHandle {
	const kernel = useRequiredKernel();
	const current = useRef<PersistenceHandle | null>(null);
	const [handle, setHandle] = useState<PersistenceHandle>(() => ({
		clear: () => current.current?.clear(),
		dispose: () => {
			current.current?.dispose();
			current.current = null;
		},
		hydrate: () => current.current?.hydrate() ?? false,
	}));
	void setHandle;
	useEffect(() => {
		const created = createPersistence({
			kernel,
			now: options.now,
			skipHydration: options.skipHydration,
			storageConfig: options.storageConfig,
		});
		current.current = created;
		return () => {
			created.dispose();
			current.current = null;
		};
	}, [kernel, options.now, options.skipHydration, options.storageConfig]);

	return handle;
};

export type { PersistenceHandle, PersistenceOptions };
