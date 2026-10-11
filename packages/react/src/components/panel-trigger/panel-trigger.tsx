'use client';

/**
 * ConsentDialogTrigger compound component.
 *
 * A draggable floating button that opens the consent dialog.
 * Supports drag-to-corner positioning and configurable icons.
 *
 * @packageDocumentation
 */

import { createElement, useEffect, useMemo, useState } from 'react';
import type { ComponentProps, FC, ReactNode } from 'react';

import { useDevToolsLauncherAvailable } from '~/devtools-launcher';

import { TriggerButton } from './atoms/button';
import type { TriggerButtonProps } from './atoms/button';
import { TriggerIcon } from './atoms/icon';
import type { TriggerIconProps } from './atoms/icon';
import { TriggerRoot, useTriggerContext } from './atoms/root';
import type { TriggerRootProps } from './atoms/root';
import { TriggerText } from './atoms/text';
import type { TriggerTextProps } from './atoms/text';
import { getTriggerToolbar, loadTriggerToolbar } from './toolbar-loader';
import type { TriggerToolbarComponent } from './toolbar-loader';
import type {
	ConsentDialogTriggerProps,
	ConsentDialogTriggerToolbarAction,
} from './types';

const EMPTY_ACTIONS: readonly ConsentDialogTriggerToolbarAction[] = [];

type DevToolsToolbarProps = ComponentProps<TriggerToolbarComponent> & {
	/** Rendered until the toolbar has loaded. */
	fallback: ReactNode;
};

/**
 * The toolbar a trigger becomes while DevTools is mounted. It loads on
 * demand; `<ConsentDevTools>` registers it before publishing its launcher,
 * so this normally renders it at once. Otherwise `fallback` shows until the
 * toolbar arrives.
 */
const DevToolsToolbar = ({ fallback, ...props }: DevToolsToolbarProps) => {
	const [loaded, setLoaded] = useState<TriggerToolbarComponent | undefined>(
		undefined
	);
	const toolbar = loaded ?? getTriggerToolbar();
	useEffect(() => {
		if (toolbar) {
			return;
		}
		let active = true;
		const load = async () => {
			try {
				const component = await loadTriggerToolbar();
				if (active) {
					setLoaded(() => component);
				}
			} catch {
				// Keep the fallback; the next mount retries the load.
			}
		};
		void load();
		return () => {
			active = false;
		};
	}, [toolbar]);
	// The toolbar is a module-level component, loaded once; createElement
	// renders it without redefining it.
	return toolbar ? createElement(toolbar, props) : fallback;
};

/**
 * Convenience component that composes the compound components.
 *
 * For simple usage, this provides a single-component API.
 * For advanced customization, use the compound components directly.
 *
 * @example
 * Simple usage:
 * ```tsx
 * <ConsentDialogTrigger />
 * ```
 *
 * @example
 * With custom icon and position:
 * ```tsx
 * <ConsentDialogTrigger
 *   icon="fingerprint"
 *   defaultPosition="top-right"
 *   size="lg"
 * />
 * ```
 *
 * @example
 * Compound component usage with text:
 * ```tsx
 * <ConsentDialogTrigger.Root>
 *   <ConsentDialogTrigger.Button>
 *     <ConsentDialogTrigger.Icon />
 *     <ConsentDialogTrigger.Text>Privacy Settings</ConsentDialogTrigger.Text>
 *   </ConsentDialogTrigger.Button>
 * </ConsentDialogTrigger.Root>
 * ```
 *
 * @example
 * Compound component with custom content:
 * ```tsx
 * <ConsentDialogTrigger.Root defaultPosition="bottom-left">
 *   <ConsentDialogTrigger.Button size="lg" className="my-custom-class">
 *     <MyCustomIcon />
 *     <span>Manage Cookies</span>
 *   </ConsentDialogTrigger.Button>
 * </ConsentDialogTrigger.Root>
 * ```
 */
const ConsentDialogTriggerComponent = ({
	icon = 'branding',
	defaultPosition = 'bottom-right',
	persistPosition = true,
	ariaLabel = 'Open privacy settings',
	showWhen = 'always',
	size = 'md',
	className,
	noStyle,
	onClick,
	onPositionChange,
}: ConsentDialogTriggerProps): ReactNode => {
	// With <ConsentDevTools> mounted, become a two-item toolbar that carries
	// the DevTools launcher, so one control occupies the corner.
	const hostsDevTools = useDevToolsLauncherAvailable();
	const preferences = useMemo(
		() => ({ className, icon, label: ariaLabel }),
		[ariaLabel, className, icon]
	);

	const button = (
		<TriggerButton
			size={size}
			ariaLabel={ariaLabel}
			className={className}
			noStyle={noStyle}
		>
			<TriggerIcon
				icon={icon}
				noStyle={noStyle}
			/>
		</TriggerButton>
	);

	return (
		<TriggerRoot
			defaultPosition={defaultPosition}
			persistPosition={persistPosition}
			showWhen={showWhen}
			onClick={onClick}
			onPositionChange={onPositionChange}
		>
			{hostsDevTools ? (
				<DevToolsToolbar
					actions={EMPTY_ACTIONS}
					fallback={button}
					noStyle={noStyle}
					preferences={preferences}
					size={size}
				/>
			) : (
				button
			)}
		</TriggerRoot>
	);
};

ConsentDialogTriggerComponent.displayName = 'ConsentDialogTrigger';

/**
 * Compound component interface for ConsentDialogTrigger.
 */
export interface ConsentDialogTriggerCompound extends FC<ConsentDialogTriggerProps> {
	/** Root component - provides context and handles portal rendering */
	Root: typeof TriggerRoot;
	/** Button component - the clickable element */
	Button: typeof TriggerButton;
	/** Icon component - renders branding or custom icons */
	Icon: typeof TriggerIcon;
	/** Text component - for adding labels */
	Text: typeof TriggerText;
}

/**
 * ConsentDialogTrigger with compound components attached.
 *
 * Can be used as a simple component or composed with sub-components:
 *
 * @example
 * Simple:
 * ```tsx
 * <ConsentDialogTrigger />
 * ```
 *
 * @example
 * Compound:
 * ```tsx
 * <ConsentDialogTrigger.Root>
 *   <ConsentDialogTrigger.Button>
 *     <ConsentDialogTrigger.Icon />
 *     <ConsentDialogTrigger.Text>Privacy</ConsentDialogTrigger.Text>
 *   </ConsentDialogTrigger.Button>
 * </ConsentDialogTrigger.Root>
 * ```
 */
export const ConsentDialogTrigger = Object.assign(
	ConsentDialogTriggerComponent,
	{
		Button: TriggerButton,
		Icon: TriggerIcon,
		Root: TriggerRoot,
		Text: TriggerText,
	}
) as ConsentDialogTriggerCompound;

export type {
	TriggerButtonProps,
	TriggerIconProps,
	TriggerRootProps,
	TriggerTextProps,
};
// Re-export atom components for direct imports
export {
	TriggerButton,
	TriggerIcon,
	TriggerRoot,
	TriggerText,
	useTriggerContext,
};
