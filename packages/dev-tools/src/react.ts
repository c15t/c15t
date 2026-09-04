/**
 * React wrapper for c15t DevTools
 *
 * Provides a React component for easy integration into React applications.
 *
 * @example
 * ```tsx
 * import { DevTools } from '@c15t/dev-tools/react';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <DevTools position="bottom-right" />
 *     </>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

'use client';

import { useEffect, useRef } from 'react';

import { createDevTools } from './core/devtools';
import type { DevToolsInstance, DevToolsOptions } from './core/devtools';
import { DEFAULT_KERNEL_NAMESPACE } from './core/store-connector';

/**
 * Props for the C15TDevTools component
 */
export interface C15TDevToolsProps extends DevToolsOptions {
	/**
	 * Whether the DevTools should be disabled
	 * Useful for production builds
	 * @default false
	 */
	disabled?: boolean;
}

/**
 * React component that renders the c15t DevTools
 *
 * This component creates a floating DevTools button that, when clicked,
 * opens a panel showing consent state, location info, scripts, and actions.
 * Hand it the kernel your provider created, or expose the kernel on
 * `window.c15tKernel` and let the devtools find it.
 *
 * @example
 * Basic usage:
 * ```tsx
 * import { DevTools } from '@c15t/dev-tools/react';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <DevTools />
 *     </>
 *   );
 * }
 * ```
 *
 * @example
 * With custom position:
 * ```tsx
 * <DevTools position="top-left" />
 * ```
 *
 * @example
 * Disabled in production:
 * ```tsx
 * <DevTools disabled={process.env.NODE_ENV === 'production'} />
 * ```
 *
 * @example
 * Default open state:
 * ```tsx
 * <DevTools defaultOpen />
 * ```
 */
export const C15TDevTools = ({
	kernel,
	namespace = DEFAULT_KERNEL_NAMESPACE,
	position = 'bottom-right',
	defaultOpen = false,
	disabled = false,
}: C15TDevToolsProps): null => {
	const devtoolsRef = useRef<DevToolsInstance | null>(null);

	useEffect(() => {
		// Don't create devtools if disabled
		if (disabled) {
			return;
		}

		// Don't create devtools during SSR
		if (typeof window === 'undefined') {
			return;
		}

		// Create devtools instance
		devtoolsRef.current = createDevTools({
			defaultOpen,
			kernel,
			namespace,
			position,
		});

		// Cleanup on unmount
		return () => {
			devtoolsRef.current?.destroy();
			devtoolsRef.current = null;
		};
	}, [kernel, namespace, position, defaultOpen, disabled]);

	// Component renders nothing - devtools injects into document.body
	return null;
};

export type { DevToolsPosition, DevToolsTab } from './core/state-manager';

// Re-export types
export type { DevToolsInstance, DevToolsOptions };
export { C15TDevTools as DevTools };
