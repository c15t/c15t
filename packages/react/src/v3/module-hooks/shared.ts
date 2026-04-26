'use client';

import type { ConsentKernel } from 'c15t/v3';
import { useContext } from 'react';
import { KernelContext } from '../context';

export function useRequiredKernel(): ConsentKernel {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error(
			'c15t: no kernel in context. Wrap with <ConsentProvider options={...}> from @c15t/react/v3.'
		);
	}
	return kernel;
}
