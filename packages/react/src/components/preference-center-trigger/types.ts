/**
 * Type definitions for the PreferenceCenterTrigger component.
 *
 * @packageDocumentation
 */

import type { CornerPosition } from '@c15t/ui/utils';
import type { ReactNode } from 'react';

/**
 * Icon options for the trigger button.
 *
 * - `'branding'` - Shows c15t or consent.io logo based on branding setting
 * - `'fingerprint'` - Generic fingerprint/privacy icon
 * - `'settings'` - Generic settings/gear icon
 * - `ReactNode` - Custom icon element
 */
export type TriggerIcon = 'branding' | 'fingerprint' | 'settings' | ReactNode;

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
 * Props for the PreferenceCenterTrigger component.
 */
export interface PreferenceCenterTriggerProps {
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
