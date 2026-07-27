/**
 * Type definitions for the consent dialog trigger components.
 *
 * @packageDocumentation
 */

import type { CornerPosition } from '@c15t/ui/utils/trigger-utils';
import type { ReactNode } from 'react';
import type { ClassNameStyle } from '~/types/theme';

/**
 * Icon rendered by a consent dialog trigger control.
 *
 * - `'branding'` - Shows c15t or INTH logo based on branding setting
 * - `'fingerprint'` - Generic fingerprint/privacy icon
 * - `'settings'` - Generic settings/gear icon
 * - `ReactNode` - Custom icon element
 */
export type TriggerIcon = 'branding' | 'fingerprint' | 'settings' | ReactNode;

/**
 * Visibility options for when to show a trigger.
 *
 * - `'always'` - Always visible
 * - `'after-consent'` - Only visible after user has made a consent choice
 * - `'never'` - Never visible (useful for programmatic control)
 */
export type TriggerVisibility = 'always' | 'after-consent' | 'never';

/**
 * Size options for trigger controls.
 */
export type TriggerSize = 'sm' | 'md' | 'lg';

/**
 * Layout direction for the consent dialog trigger toolbar.
 */
export type TriggerOrientation = 'horizontal' | 'vertical';

/**
 * Props for the existing single-button ConsentDialogTrigger component.
 */
export interface ConsentDialogTriggerProps {
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
	 * Accessible label for the trigger button.
	 *
	 * @default 'Open privacy settings'
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
	 * Callback fired when the trigger is clicked, before opening the dialog.
	 */
	onClick?: () => void;

	/**
	 * Callback fired when the corner position changes.
	 */
	onPositionChange?: (position: CornerPosition) => void;
}

/**
 * A custom action displayed in ConsentDialogTriggerToolbar.
 */
export interface ConsentDialogTriggerToolbarAction {
	/** Stable key for the action. */
	id: string;

	/** Accessible name announced for the action button. */
	label: string;

	/** Icon displayed in the action. */
	icon: TriggerIcon;

	/** Callback fired when the action is selected. */
	onSelect: () => void;

	/** Whether the action is disabled. */
	disabled?: boolean;

	/** Whether the action represents a currently active toggle state. */
	pressed?: boolean;

	/** Additional CSS class names for the action button. */
	className?: string;

	/** Inline styles for the action button. */
	style?: ClassNameStyle['style'];
}

/**
 * Customization for the toolbar's built-in privacy preferences action.
 */
export interface ConsentDialogTriggerToolbarPreferences {
	/**
	 * Accessible name announced for the preferences button.
	 *
	 * @default 'Open privacy settings'
	 */
	label?: string;

	/**
	 * Icon displayed in the preferences button.
	 *
	 * @default 'branding'
	 */
	icon?: TriggerIcon;

	/** Callback fired before the preferences dialog opens. */
	onSelect?: () => void;

	/** Additional CSS class names for the preferences button. */
	className?: string;

	/** Inline styles for the preferences button. */
	style?: ClassNameStyle['style'];
}

/**
 * Props for the standalone ConsentDialogTriggerToolbar component.
 */
export interface ConsentDialogTriggerToolbarProps
	extends Omit<ClassNameStyle, 'baseClassName'> {
	/**
	 * App-owned actions rendered alongside the built-in preferences action.
	 *
	 * @default []
	 */
	actions?: readonly ConsentDialogTriggerToolbarAction[];

	/**
	 * Customization for the built-in preferences action. The toolbar always
	 * renders exactly one preferences action.
	 */
	preferences?: ConsentDialogTriggerToolbarPreferences;

	/**
	 * Layout direction for the toolbar.
	 *
	 * @default 'horizontal'
	 */
	orientation?: TriggerOrientation;

	/**
	 * Default corner position for the toolbar.
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
	 * Accessible label for the toolbar.
	 *
	 * @default 'Privacy controls'
	 */
	ariaLabel?: string;

	/**
	 * Controls when the toolbar is visible.
	 *
	 * @default 'always'
	 */
	showWhen?: TriggerVisibility;

	/**
	 * Size of each toolbar action.
	 *
	 * @default 'md'
	 */
	size?: TriggerSize;

	/**
	 * Callback fired when the corner position changes.
	 */
	onPositionChange?: (position: CornerPosition) => void;
}

/**
 * Re-export CornerPosition for convenience.
 */
export type { CornerPosition };
