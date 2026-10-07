'use client';

import type { DevToolsProps } from 'c15t/next/devtools';
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// The DevTools panel lists every script and whether it is blocked, loading
// or loaded. The dynamic import keeps it out of the production bundle.
const DevTools: ComponentType<DevToolsProps> =
	process.env.NODE_ENV === 'development'
		? dynamic(async () => (await import('c15t/next/devtools')).DevTools, {
				ssr: false,
			})
		: () => null;

export const ConsentDevTools = () => (
	<DevTools
		position="bottom-right"
		defaultTab="scripts"
	/>
);
