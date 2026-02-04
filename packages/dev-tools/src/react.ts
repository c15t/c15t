/**
 * React wrapper for c15t DevTools
 *
 * Provides a React component for easy integration into React applications.
 *
 * @example
 * ```tsx
 * import { C15TDevTools } from '@c15t/dev-tools/react';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <C15TDevTools position="bottom-right" />
 *     </>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

'use client';

import { useEffect, useRef } from 'react';
import {
	createDevTools,
	type DevToolsInstance,
	type DevToolsOptions,
} from './core/devtools';

/**
 * Props for the C15TDevTools component
 */
export interface C15TDevToolsProps extends Partial<DevToolsOptions> {
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
 *
 * @example
 * Basic usage:
 * ```tsx
 * import { C15TDevTools } from '@c15t/dev-tools/react';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <C15TDevTools />
 *     </>
 *   );
 * }
 * ```
 *
 * @example
 * With custom position:
 * ```tsx
 * <C15TDevTools position="top-left" />
 * ```
 *
 * @example
 * Disabled in production:
 * ```tsx
 * <C15TDevTools disabled={process.env.NODE_ENV === 'production'} />
 * ```
 *
 * @example
 * Default open state:
 * ```tsx
 * <C15TDevTools defaultOpen />
 * ```
 */
export function C15TDevTools({
	namespace = 'c15tStore',
	position = 'bottom-right',
	defaultOpen = false,
	disabled = false,
}: C15TDevToolsProps): null {
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
			namespace,
			position,
			defaultOpen,
		});

		// Cleanup on unmount
		return () => {
			devtoolsRef.current?.destroy();
			devtoolsRef.current = null;
		};
	}, [namespace, position, defaultOpen, disabled]);

	// Component renders nothing - devtools injects into document.body
	return null;
}

// Re-export types
export type { DevToolsOptions, DevToolsInstance };
export type { DevToolsPosition, DevToolsTab } from './core/state-manager';
