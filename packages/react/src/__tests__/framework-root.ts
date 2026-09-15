import type { KernelConfig } from '@c15t/core';
import type { ConsentProviderOptions } from '@c15t/react';
import type { ComponentType, ReactNode } from 'react';

/**
 * Props exercised by the shared framework integration suites: each
 * framework's `ConsentRoot` takes the visitor's resolved `state`.
 */
export type FrameworkRoot = ComponentType<{
	state: KernelConfig;
	persistence?: ConsentProviderOptions['persistence'];
	options?: ConsentProviderOptions;
	children: ReactNode;
}>;
