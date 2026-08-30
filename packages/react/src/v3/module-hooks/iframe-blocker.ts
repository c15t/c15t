'use client';

import type { IframeBlockerHandle } from '@c15t/core/v3/modules/iframe-blocker';
import { useEffect, useRef } from 'react';

import { useRequiredKernel } from './shared';

export interface UseIframeBlockerOptions {
	disableAutomaticBlocking?: boolean;
}

export function useIframeBlocker(
	options: UseIframeBlockerOptions = {}
): IframeBlockerHandle {
	const kernel = useRequiredKernel();
	const handleRef = useRef<IframeBlockerHandle | null>(null);
	const latestOptionsRef = useRef(options);
	latestOptionsRef.current = options;

	const facadeRef = useRef<IframeBlockerHandle | null>(null);
	if (!facadeRef.current) {
		facadeRef.current = {
			dispose() {
				handleRef.current?.dispose();
				handleRef.current = null;
			},
			processAllIframes() {
				handleRef.current?.processAllIframes();
			},
		};
	}
	const handle = facadeRef.current;

	useEffect(() => {
		let disposed = false;
		void import('@c15t/core/v3/modules/iframe-blocker').then(
			({ createIframeBlocker }) => {
				if (disposed) return;
				const created = createIframeBlocker({
					kernel,
					disableAutomaticBlocking:
						latestOptionsRef.current.disableAutomaticBlocking,
				});
				handleRef.current = created;
			}
		);

		return () => {
			disposed = true;
			handleRef.current?.dispose();
			handleRef.current = null;
		};
	}, [kernel]);

	return handle;
}

export type { IframeBlockerHandle };
