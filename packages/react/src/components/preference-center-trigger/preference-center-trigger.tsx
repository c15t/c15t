'use client';

/**
 * PreferenceCenterTrigger compound component.
 *
 * A draggable floating button that opens the preference center.
 * Supports drag-to-corner positioning and configurable icons.
 *
 * @packageDocumentation
 */

import type { FC, ReactNode } from 'react';
import { TriggerButton, type TriggerButtonProps } from './atoms/button';
import { TriggerIcon, type TriggerIconProps } from './atoms/icon';
import {
	TriggerRoot,
	type TriggerRootProps,
	useTriggerContext,
} from './atoms/root';
import { TriggerText, type TriggerTextProps } from './atoms/text';
import type { PreferenceCenterTriggerProps } from './types';

/**
 * Convenience component that composes the compound components.
 *
 * For simple usage, this provides a single-component API.
 * For advanced customization, use the compound components directly.
 *
 * @example
 * Simple usage:
 * ```tsx
 * <PreferenceCenterTrigger />
 * ```
 *
 * @example
 * With custom icon and position:
 * ```tsx
 * <PreferenceCenterTrigger
 *   icon="fingerprint"
 *   defaultPosition="top-right"
 *   size="lg"
 * />
 * ```
 *
 * @example
 * Compound component usage with text:
 * ```tsx
 * <PreferenceCenterTrigger.Root>
 *   <PreferenceCenterTrigger.Button>
 *     <PreferenceCenterTrigger.Icon />
 *     <PreferenceCenterTrigger.Text>Privacy Settings</PreferenceCenterTrigger.Text>
 *   </PreferenceCenterTrigger.Button>
 * </PreferenceCenterTrigger.Root>
 * ```
 *
 * @example
 * Compound component with custom content:
 * ```tsx
 * <PreferenceCenterTrigger.Root defaultPosition="bottom-left">
 *   <PreferenceCenterTrigger.Button size="lg" className="my-custom-class">
 *     <MyCustomIcon />
 *     <span>Manage Cookies</span>
 *   </PreferenceCenterTrigger.Button>
 * </PreferenceCenterTrigger.Root>
 * ```
 */
function PreferenceCenterTriggerComponent({
	icon = 'branding',
	defaultPosition = 'bottom-right',
	persistPosition = true,
	ariaLabel = 'Open privacy settings',
	showWhen = 'always',
	size = 'md',
	className,
	noStyle = false,
	onClick,
	onPositionChange,
}: PreferenceCenterTriggerProps): ReactNode {
	return (
		<TriggerRoot
			defaultPosition={defaultPosition}
			persistPosition={persistPosition}
			showWhen={showWhen}
			onClick={onClick}
			onPositionChange={onPositionChange}
		>
			<TriggerButton
				size={size}
				ariaLabel={ariaLabel}
				className={className}
				noStyle={noStyle}
			>
				<TriggerIcon icon={icon} noStyle={noStyle} />
			</TriggerButton>
		</TriggerRoot>
	);
}

PreferenceCenterTriggerComponent.displayName = 'PreferenceCenterTrigger';

/**
 * Compound component interface for PreferenceCenterTrigger.
 */
export interface PreferenceCenterTriggerCompound
	extends FC<PreferenceCenterTriggerProps> {
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
 * PreferenceCenterTrigger with compound components attached.
 *
 * Can be used as a simple component or composed with sub-components:
 *
 * @example
 * Simple:
 * ```tsx
 * <PreferenceCenterTrigger />
 * ```
 *
 * @example
 * Compound:
 * ```tsx
 * <PreferenceCenterTrigger.Root>
 *   <PreferenceCenterTrigger.Button>
 *     <PreferenceCenterTrigger.Icon />
 *     <PreferenceCenterTrigger.Text>Privacy</PreferenceCenterTrigger.Text>
 *   </PreferenceCenterTrigger.Button>
 * </PreferenceCenterTrigger.Root>
 * ```
 */
export const PreferenceCenterTrigger = Object.assign(
	PreferenceCenterTriggerComponent,
	{
		Root: TriggerRoot,
		Button: TriggerButton,
		Icon: TriggerIcon,
		Text: TriggerText,
	}
) as PreferenceCenterTriggerCompound;

// Re-export atom components for direct imports
export {
	TriggerRoot,
	TriggerButton,
	TriggerIcon,
	TriggerText,
	useTriggerContext,
};
export type {
	TriggerRootProps,
	TriggerButtonProps,
	TriggerIconProps,
	TriggerTextProps,
};
