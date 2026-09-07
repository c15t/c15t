'use client';

/**
 * Standalone configurable toolbar for resurfacing consent preferences alongside
 * app-owned controls.
 *
 * @packageDocumentation
 */

import type { ReactNode } from 'react';

import { TriggerRoot } from './atoms/root';
import { TriggerToolbar } from './atoms/toolbar';
import type {
	ConsentDialogTriggerToolbarAction,
	ConsentDialogTriggerToolbarPreferences,
	ConsentDialogTriggerToolbarProps,
} from './types';

const EMPTY_ACTIONS: readonly ConsentDialogTriggerToolbarAction[] = [];
const DEFAULT_PREFERENCES: ConsentDialogTriggerToolbarPreferences = {};

/**
 * A draggable toolbar that always includes one action for opening consent
 * preferences and can include app-owned actions such as theme or support
 * controls.
 *
 * @example
 * ```tsx
 * <ConsentDialogTriggerToolbar
 *   ariaLabel="Website controls"
 *   actions={[
 *     {
 *       id: 'theme',
 *       label: 'Switch to dark theme',
 *       icon: <MoonIcon />,
 *       pressed: isDark,
 *       onSelect: toggleTheme,
 *     },
 *   ]}
 * />
 * ```
 *
 * @returns The toolbar portal, or `null` while hidden or server-rendered.
 */
export const ConsentDialogTriggerToolbar = ({
	actions = EMPTY_ACTIONS,
	preferences = DEFAULT_PREFERENCES,
	orientation = 'horizontal',
	defaultPosition = 'bottom-right',
	persistPosition = true,
	ariaLabel = 'Privacy controls',
	showWhen = 'always',
	size = 'md',
	className,
	style,
	noStyle = false,
	onPositionChange,
}: ConsentDialogTriggerToolbarProps): ReactNode => (
	<TriggerRoot
		defaultPosition={defaultPosition}
		onPositionChange={onPositionChange}
		persistPosition={persistPosition}
		showWhen={showWhen}
	>
		<TriggerToolbar
			actions={actions}
			ariaLabel={ariaLabel}
			className={className}
			noStyle={noStyle}
			orientation={orientation}
			preferences={preferences}
			size={size}
			style={style}
		/>
	</TriggerRoot>
);

ConsentDialogTriggerToolbar.displayName = 'ConsentDialogTriggerToolbar';
