import type { KernelConfig } from '@c15t/core';
import type { ConsentProviderOptions } from '@c15t/react';
import type { ComponentType, ReactNode } from 'react';

/** Props exercised by the shared framework integration suites. */
export type FrameworkBoundary = ComponentType<{
	config: KernelConfig;
	persistence?: ConsentProviderOptions['persistence'];
	options?: ConsentProviderOptions;
	children: ReactNode;
}>;
