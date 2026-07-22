'use client';

/**
 * ConsentDialogTrigger compound component.
 *
 * A draggable floating button that opens the consent dialog.
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
import { TriggerToolbar } from './atoms/toolbar';
import type { ConsentDialogTriggerProps } from './types';

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
function ConsentDialogTriggerComponent({
	items,
	orientation = 'horizontal',
	icon = 'branding',
	defaultPosition = 'bottom-right',
	persistPosition = true,
	ariaLabel,
	showWhen = 'always',
	size = 'md',
	className,
	noStyle = false,
	onClick,
	onPositionChange,
}: ConsentDialogTriggerProps): ReactNode {
	if (items && items.length === 0) {
		return null;
	}

	return (
		<TriggerRoot
			defaultPosition={defaultPosition}
			persistPosition={persistPosition}
			showWhen={showWhen}
			onClick={onClick}
			onPositionChange={onPositionChange}
		>
			{items ? (
				<TriggerToolbar
					items={items}
					size={size}
					orientation={orientation}
					ariaLabel={ariaLabel ?? 'Privacy controls'}
					className={className}
					noStyle={noStyle}
				/>
			) : (
				<TriggerButton
					size={size}
					ariaLabel={ariaLabel ?? 'Open privacy settings'}
					className={className}
					noStyle={noStyle}
				>
					<TriggerIcon icon={icon} noStyle={noStyle} />
				</TriggerButton>
			)}
		</TriggerRoot>
	);
}

ConsentDialogTriggerComponent.displayName = 'ConsentDialogTrigger';

/**
 * Compound component interface for ConsentDialogTrigger.
 */
export interface ConsentDialogTriggerCompound
	extends FC<ConsentDialogTriggerProps> {
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
		Root: TriggerRoot,
		Button: TriggerButton,
		Icon: TriggerIcon,
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
