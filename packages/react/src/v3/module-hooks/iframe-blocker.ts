'use client';

import type { IframeBlockerHandle } from '@c15t/core/v3/modules/iframe-blocker';
import { useEffect, useRef, useState } from 'react';

import { useRequiredKernel } from './shared';

const loadIframeBlockerModule = () =>
	import('@c15t/core/v3/modules/iframe-blocker');

export interface UseIframeBlockerOptions {
	disableAutomaticBlocking?: boolean;
}

export const useIframeBlocker = function useIframeBlocker(
	options: UseIframeBlockerOptions = {}
): IframeBlockerHandle {
	const kernel = useRequiredKernel();
	const handleRef = useRef<IframeBlockerHandle | null>(null);

	const [handle, setHandle] = useState<IframeBlockerHandle>(() => ({
		dispose() {
			handleRef.current?.dispose();
			handleRef.current = null;
		},
		processAllIframes() {
			handleRef.current?.processAllIframes();
		},
	}));
	void setHandle;

	useEffect(() => {
		let disposed = false;
		void (async () => {
			const { createIframeBlocker } = await loadIframeBlockerModule();
			if (disposed) {
				return;
			}
			const created = createIframeBlocker({
				disableAutomaticBlocking: options.disableAutomaticBlocking,
				kernel,
			});
			handleRef.current = created;
		})();

		return () => {
			disposed = true;
			handleRef.current?.dispose();
			handleRef.current = null;
		};
	}, [kernel, options.disableAutomaticBlocking]);

	return handle;
};

export type { IframeBlockerHandle };
