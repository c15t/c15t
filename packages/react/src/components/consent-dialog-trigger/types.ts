/**
 * Type definitions for the ConsentDialogTrigger component.
 *
 * @packageDocumentation
 */

import type { CornerPosition } from '@c15t/ui/utils/trigger-utils';
import type { ReactNode } from 'react';

/**
 * Icon options for the trigger button.
 *
 * - `'branding'` - Shows c15t or INTH logo based on branding setting
 * - `'fingerprint'` - Generic fingerprint/privacy icon
 * - `'settings'` - Generic settings/gear icon
 * - `ReactNode` - Custom icon element
 */
export type TriggerIconSource =
	| 'branding'
	| 'fingerprint'
	| 'settings'
	| ReactNode;

/**
 * A light/dark icon pair. Both icons are rendered and CSS selects the active
 * one, which keeps theme changes hydration-safe.
 */
export interface TriggerIconPair {
	/** Icon shown in light mode. */
	light: TriggerIconSource;
	/** Icon shown in dark mode. */
	dark: TriggerIconSource;
}

export type TriggerIcon = TriggerIconSource | TriggerIconPair;

/**
 * Shared fields for an item in the segmented trigger toolbar.
 */
interface ConsentDialogTriggerItemBase {
	/** Stable key for the item. */
	id: string;

	/** Accessible name announced for the item button. */
	label: string;

	/** Icon displayed in the item. Supports light and dark variants. */
	icon: TriggerIcon;

	/** Whether the item is disabled. */
	disabled?: boolean;
}

/**
 * An item that opens the c15t consent preferences dialog.
 */
export interface ConsentDialogTriggerPreferencesItem
	extends ConsentDialogTriggerItemBase {
	action: 'preferences';

	/** Callback fired before the preferences dialog opens. */
	onSelect?: () => void;
}

/**
 * A custom toolbar action, such as theme switching or support chat.
 */
export interface ConsentDialogTriggerCustomItem
	extends ConsentDialogTriggerItemBase {
	action: 'custom';

	/** Callback fired when the item is selected. */
	onSelect: () => void;
}

/**
 * An action displayed in the segmented trigger toolbar.
 */
export type ConsentDialogTriggerItem =
	| ConsentDialogTriggerPreferencesItem
	| ConsentDialogTriggerCustomItem;

/**
 * Visibility options for when to show the trigger.
 *
 * - `'always'` - Always visible
 * - `'after-consent'` - Only visible after user has made a consent choice
 * - `'never'` - Never visible (useful for programmatic control)
 */
export type TriggerVisibility = 'always' | 'after-consent' | 'never';

/**
 * Size options for the trigger button.
 */
export type TriggerSize = 'sm' | 'md' | 'lg';

/**
 * Layout direction for a segmented trigger toolbar.
 */
export type TriggerOrientation = 'horizontal' | 'vertical';

/**
 * Props for the ConsentDialogTrigger component.
 */
export interface ConsentDialogTriggerProps {
	/**
	 * Actions to render as a segmented toolbar. When omitted, the component
	 * keeps its original single-button appearance and behavior.
	 *
	 * @example
	 * ```tsx
	 * items={[
	 *   {
	 *     id: 'support',
	 *     label: 'Open support chat',
	 *     icon: <ChatIcon />,
	 *     action: 'custom',
	 *     onSelect: openSupportChat,
	 *   },
	 *   {
	 *     id: 'privacy',
	 *     label: 'Open privacy settings',
	 *     icon: 'settings',
	 *     action: 'preferences',
	 *   },
	 * ]}
	 * ```
	 */
	items?: readonly ConsentDialogTriggerItem[];

	/**
	 * Layout direction for the segmented toolbar. Only applies when `items` are
	 * provided.
	 *
	 * @default 'horizontal'
	 */
	orientation?: TriggerOrientation;

	/**
	 * Icon to display in the trigger button.
	 *
	 * @default 'branding'
	 */
	icon?: TriggerIcon;

	/**
	 * Default corner position for the trigger.
	 * User can drag to any corner and the position will be remembered.
	 *
	 * @default 'bottom-right'
	 */
	defaultPosition?: CornerPosition;

	/**
	 * Whether to persist the user's position preference in localStorage.
	 *
	 * @default true
	 */
	persistPosition?: boolean;

	/**
	 * Accessible label for the trigger button, or for the toolbar when `items`
	 * are provided.
	 *
	 * @default 'Open privacy settings' for the single button; 'Privacy controls'
	 * for the toolbar.
	 */
	ariaLabel?: string;

	/**
	 * Additional CSS class names.
	 */
	className?: string;

	/**
	 * When true, removes default styling.
	 *
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * Controls when the trigger is visible.
	 *
	 * @default 'always'
	 */
	showWhen?: TriggerVisibility;

	/**
	 * Size of the trigger button.
	 *
	 * @default 'md'
	 */
	size?: TriggerSize;

	/**
	 * Callback fired when the trigger is clicked (before opening dialog).
	 */
	onClick?: () => void;

	/**
	 * Callback fired when the corner position changes.
	 */
	onPositionChange?: (position: CornerPosition) => void;
}

/**
 * Re-export CornerPosition for convenience.
 */
export type { CornerPosition };
