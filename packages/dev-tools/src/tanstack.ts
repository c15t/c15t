/**
 * TanStack DevTools Plugin
 *
 * Provides c15t integration for TanStack DevTools
 *
 * @example
 * ```tsx
 * import { TanStackDevtools } from '@tanstack/react-devtools';
 * import { c15tDevtoolsPlugin } from '@c15t/dev-tools/tanstack';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <TanStackDevtools plugins={[c15tDevtoolsPlugin()]} />
 *     </>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

import { createDevToolsPanel } from './core/devtools';

/**
 * TanStack DevTools plugin interface
 */
export interface DevToolsPlugin {
	name: string;
	label: string;
	render: (container: HTMLElement) => () => void;
}

/**
 * Options for the c15t Dev Tools plugin
 */
export interface C15tDevtoolsPluginOptions {
	/**
	 * Namespace for the c15tStore on window
	 * @default 'c15tStore'
	 */
	namespace?: string;
}

/**
 * Creates a c15t plugin for TanStack DevTools
 */
export function c15tDevtoolsPlugin(
	options: C15tDevtoolsPluginOptions = {}
): DevToolsPlugin {
	const { namespace = 'c15tStore' } = options;

	return {
		name: 'c15t',
		label: 'Consent',
		render: (container: HTMLElement) => {
			const panel = createDevToolsPanel({
				namespace,
				mode: 'embedded',
			});

			container.appendChild(panel.element);

			return () => {
				panel.destroy();
			};
		},
	};
}

// Re-export types that might be useful
export type { DevToolsPosition, DevToolsTab } from './core/state-manager';
