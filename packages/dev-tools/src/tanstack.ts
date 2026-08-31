/**
 * TanStack DevTools integration
 *
 * Provides a React panel component and plugin factory that follow
 * TanStack Devtools' documented `render: <Panel />` API.
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

'use client';

import type { CSSProperties, HTMLAttributes, ReactElement } from 'react';
import * as React from 'react';

import { createDevToolsPanel } from './core/devtools';

/**
 * Props for the embedded c15t panel used inside TanStack Devtools.
 */
export interface C15tTanStackDevtoolsPanelProps extends HTMLAttributes<HTMLDivElement> {
	/**
	 * Panel factory. Primarily useful for tests and custom embedders.
	 * @default createDevToolsPanel
	 * @internal
	 */
	createPanel?: typeof createDevToolsPanel;

	/**
	 * Namespace for the c15tStore on window.
	 * @default 'c15tStore'
	 */
	namespace?: string;
}

/**
 * Plugin configuration for React TanStack Devtools.
 */
export interface TanStackDevtoolsPlugin {
	id?: string;
	name: string;
	defaultOpen?: boolean;
	render: ReactElement;
}

/**
 * Options for the c15t TanStack Devtools plugin factory.
 */
export interface C15tDevtoolsPluginOptions extends C15tTanStackDevtoolsPanelProps {
	/**
	 * Stable plugin identifier used by TanStack Devtools.
	 * @default 'c15t'
	 */
	id?: string;

	/**
	 * Display name shown in the TanStack Devtools sidebar.
	 * @default 'c15t'
	 */
	name?: string;

	/**
	 * Whether the c15t panel should be open on first load.
	 * @default false
	 */
	defaultOpen?: boolean;
}

const embeddedPanelStyle: CSSProperties = {
	height: '100%',
	minHeight: 0,
	width: '100%',
};

const EMBEDDED_PANEL_RELEASE_DELAY_MS = 60_000;

interface SharedEmbeddedPanelEntry {
	panel: ReturnType<typeof createDevToolsPanel>;
	refCount: number;
	releaseTimeout: ReturnType<typeof setTimeout> | null;
}

const sharedEmbeddedPanels = new Map<string, SharedEmbeddedPanelEntry>();

const getEmbeddedPanelKey = function getEmbeddedPanelKey(
	namespace: string,
	createPanel: typeof createDevToolsPanel
): string {
	return `${namespace}:${createPanel === createDevToolsPanel ? 'default' : 'custom'}`;
};

const acquireEmbeddedPanel = function acquireEmbeddedPanel(
	namespace: string,
	createPanel: typeof createDevToolsPanel
): SharedEmbeddedPanelEntry {
	const panelKey = getEmbeddedPanelKey(namespace, createPanel);
	const existingPanel = sharedEmbeddedPanels.get(panelKey);

	if (existingPanel) {
		if (existingPanel.releaseTimeout) {
			clearTimeout(existingPanel.releaseTimeout);
			existingPanel.releaseTimeout = null;
		}
		existingPanel.refCount += 1;
		return existingPanel;
	}

	const panel = createPanel({
		mode: 'embedded',
		namespace,
	});
	const entry: SharedEmbeddedPanelEntry = {
		panel,
		refCount: 1,
		releaseTimeout: null,
	};
	sharedEmbeddedPanels.set(panelKey, entry);
	return entry;
};

const releaseEmbeddedPanel = function releaseEmbeddedPanel(
	namespace: string,
	createPanel: typeof createDevToolsPanel
): void {
	const panelKey = getEmbeddedPanelKey(namespace, createPanel);
	const entry = sharedEmbeddedPanels.get(panelKey);

	if (!entry) {
		return;
	}

	entry.refCount = Math.max(0, entry.refCount - 1);

	if (entry.refCount > 0 || entry.releaseTimeout) {
		return;
	}

	entry.releaseTimeout = setTimeout(() => {
		const currentEntry = sharedEmbeddedPanels.get(panelKey);

		if (!currentEntry || currentEntry.refCount > 0) {
			return;
		}

		currentEntry.panel.destroy();
		sharedEmbeddedPanels.delete(panelKey);
	}, EMBEDDED_PANEL_RELEASE_DELAY_MS);
};

/**
 * React panel component for embedding c15t DevTools inside TanStack Devtools.
 */
export const C15tTanStackDevtoolsPanel = ({
	createPanel = createDevToolsPanel,
	namespace = 'c15tStore',
	style,
	...props
}: C15tTanStackDevtoolsPanelProps): React.JSX.Element => {
	const containerRef = React.useRef<HTMLDivElement | null>(null);

	React.useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const entry = acquireEmbeddedPanel(namespace, createPanel);
		container.replaceChildren(entry.panel.element);

		return () => {
			if (entry.panel.element.parentElement === container) {
				container.removeChild(entry.panel.element);
			}
			releaseEmbeddedPanel(namespace, createPanel);
		};
	}, [namespace, createPanel]);

	return React.createElement('div', {
		...props,
		ref: containerRef,
		style: {
			...embeddedPanelStyle,
			...style,
		},
	});
};

const createC15tDevtoolsPlugin = function createC15tDevtoolsPlugin(
	options: C15tDevtoolsPluginOptions = {}
): TanStackDevtoolsPlugin {
	const {
		namespace = 'c15tStore',
		id = 'c15t',
		name = 'c15t',
		defaultOpen = false,
		...panelProps
	} = options;

	return {
		defaultOpen,
		id,
		name,
		render: React.createElement(C15tTanStackDevtoolsPanel, {
			...panelProps,
			namespace,
		}),
	};
};

/**
 * Creates a c15t plugin config for TanStack Devtools.
 */
export const c15tDevtools = function c15tDevtools(
	options: C15tDevtoolsPluginOptions = {}
): TanStackDevtoolsPlugin {
	return createC15tDevtoolsPlugin(options);
};

/**
 * Backward-compatible alias for the TanStack Devtools plugin factory.
 */
export const c15tDevtoolsPlugin = c15tDevtools;

export type { DevToolsPosition, DevToolsTab } from './core/state-manager';
