'use client';

import type { ConsentKernel } from '@c15t/core';
import { createDevTools } from '@c15t/dev-tools';
import type {
	DevToolsInstance,
	DevToolsOptions,
	DevToolsPosition,
	DevToolsTab,
} from '@c15t/dev-tools';
import {
	createElement,
	forwardRef,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
} from 'react';
import type { ForwardedRef, HTMLAttributes, ReactElement } from 'react';

import { KernelContext } from './context';

/** Props for the kernel-bound React DevTools adapter. */
export interface ConsentDevToolsProps extends Omit<
	DevToolsOptions,
	'container' | 'kernel'
> {
	/** Prevents the DevTools engine from mounting. @default false */
	disabled?: boolean;
}

/** Backward-compatible props name for {@link ConsentDevTools}. */
export type C15TDevToolsProps = ConsentDevToolsProps;

/** Compatible props name for the {@link DevTools} alias. */
export type DevToolsProps = ConsentDevToolsProps;

const requireKernel = (kernel: ConsentKernel | null): ConsentKernel => {
	if (!kernel) {
		throw new Error(
			'c15t: DevTools must be rendered inside <ConsentProvider> from @c15t/react.'
		);
	}
	return kernel;
};

/**
 * Mounts the c15t DevTools engine for the nearest v3 consent provider.
 *
 * @param props - Presentation options passed to the DevTools engine.
 * @returns `null`; the engine mounts its interface into `document.body`.
 */
export const ConsentDevTools = ({
	disabled = false,
	defaultOpen,
	defaultTab,
	getConsentCategories,
	maxEvents,
	position,
}: ConsentDevToolsProps): null => {
	const contextKernel = useContext(KernelContext);
	const kernel = disabled ? null : requireKernel(contextKernel);

	useEffect(() => {
		if (!kernel) {
			return;
		}

		const devTools = createDevTools({
			defaultOpen,
			defaultTab,
			getConsentCategories,
			kernel,
			maxEvents,
			position,
		});
		return () => devTools.destroy();
	}, [
		defaultOpen,
		defaultTab,
		getConsentCategories,
		kernel,
		maxEvents,
		position,
	]);

	return null;
};

/** Compatible short name for {@link ConsentDevTools}. */
export const DevTools = ConsentDevTools;

/** Backward-compatible name for {@link ConsentDevTools}. */
export const C15TDevTools = ConsentDevTools;

/** Props for the embedded c15t panel used by TanStack Devtools. */
export interface C15tTanStackDevtoolsPanelProps
	extends
		HTMLAttributes<HTMLDivElement>,
		Pick<DevToolsOptions, 'defaultTab' | 'maxEvents' | 'getConsentCategories'> {
	/** Prevents the embedded DevTools engine from mounting. @default false */
	disabled?: boolean;
}

/** Plugin configuration accepted by React TanStack Devtools. */
export interface TanStackDevtoolsPlugin {
	id?: string;
	name: string;
	defaultOpen?: boolean;
	render: ReactElement;
}

/** Options for {@link c15tDevtools}. */
export interface C15tDevtoolsPluginOptions extends C15tTanStackDevtoolsPanelProps {
	/** Stable plugin identifier. @default 'c15t' */
	id?: string;
	/** Display name shown by TanStack Devtools. @default 'c15t' */
	name?: string;
	/** Whether TanStack Devtools opens this plugin initially. @default false */
	defaultOpen?: boolean;
}

const EMBEDDED_PANEL_STYLE = {
	height: '100%',
	minHeight: 0,
	width: '100%',
} as const;

const assignRef = (
	ref: ForwardedRef<HTMLDivElement>,
	value: HTMLDivElement | null
): void => {
	if (typeof ref === 'function') {
		ref(value);
	} else if (ref) {
		ref.current = value;
	}
};

/** Embeds c15t DevTools inside a TanStack Devtools plugin panel. */
export const C15tTanStackDevtoolsPanel = forwardRef<
	HTMLDivElement,
	C15tTanStackDevtoolsPanelProps
>(
	// oxlint-disable-next-line prefer-arrow-callback -- A named function gives the forwarded component a display name.
	function C15tTanStackDevtoolsPanel(
		{
			disabled = false,
			defaultTab,
			getConsentCategories,
			maxEvents,
			style,
			...containerProps
		},
		forwardedRef
	) {
		const contextKernel = useContext(KernelContext);
		const kernel = disabled ? null : requireKernel(contextKernel);
		const containerRef = useRef<HTMLDivElement | null>(null);
		const setContainerRef = useCallback(
			(value: HTMLDivElement | null) => {
				containerRef.current = value;
				assignRef(forwardedRef, value);
			},
			[forwardedRef]
		);

		useLayoutEffect(() => {
			const container = containerRef.current;
			if (!kernel || !container) {
				return;
			}

			const devTools = createDevTools({
				container,
				defaultOpen: true,
				defaultTab,
				getConsentCategories,
				kernel,
				maxEvents,
			});
			devTools.element?.classList.add('c15t-dev-tools--embedded');

			return () => devTools.destroy();
		}, [defaultTab, getConsentCategories, kernel, maxEvents]);

		return (
			<div
				{...containerProps}
				ref={setContainerRef}
				style={{ ...EMBEDDED_PANEL_STYLE, ...style }}
			/>
		);
	}
);

/** Creates the c15t plugin configuration for React TanStack Devtools. */
export const c15tDevtools = (
	options: C15tDevtoolsPluginOptions = {}
): TanStackDevtoolsPlugin => {
	const {
		id = 'c15t',
		name = 'c15t',
		defaultOpen = false,
		...panelProps
	} = options;

	return {
		defaultOpen,
		id,
		name,
		render: createElement(C15tTanStackDevtoolsPanel, panelProps),
	};
};

/** Backward-compatible alias for {@link c15tDevtools}. */
export const c15tDevtoolsPlugin = c15tDevtools;

export type {
	DevToolsInstance,
	DevToolsOptions,
	DevToolsPosition,
	DevToolsTab,
};
