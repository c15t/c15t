'use client';

import {
	createIframeBlocker,
	type IframeBlockerHandle,
} from 'c15t/v3/modules/iframe-blocker';
import { useEffect, useState } from 'react';
import { useRequiredKernel } from './shared';

export interface UseIframeBlockerOptions {
	disableAutomaticBlocking?: boolean;
}

export function useIframeBlocker(
	options: UseIframeBlockerOptions = {}
): IframeBlockerHandle {
	const kernel = useRequiredKernel();
	const [handle] = useState(() =>
		createIframeBlocker({
			kernel,
			disableAutomaticBlocking: options.disableAutomaticBlocking,
		})
	);

	useEffect(() => {
		return () => handle.dispose();
	}, [handle]);

	return handle;
}

export type { IframeBlockerHandle };
