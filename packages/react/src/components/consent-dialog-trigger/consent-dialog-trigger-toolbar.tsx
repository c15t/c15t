'use client';

/**
 * Standalone configurable toolbar for resurfacing consent preferences alongside
 * app-owned controls.
 *
 * @packageDocumentation
 */

import type { ReactNode } from 'react';

import { usePromptRequirement } from '~/hooks';

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
 * A draggable toolbar for app-owned controls such as a theme toggle or
 * support chat, plus one built-in action for opening consent preferences.
 *
 * The toolbar itself does not depend on the consent policy: app-owned
 * actions always render. `showWhen` governs only the built-in preferences
 * action, so `after-prompt` hides that one item while a choice or notice is
 * owed and the rest of the toolbar stays put. The toolbar renders nothing
 * only when it has no visible item.
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
}: ConsentDialogTriggerToolbarProps): ReactNode => {
	const promptRequirement = usePromptRequirement();
	const promptSettled =
		showWhen !== 'after-prompt' || promptRequirement.kind === 'none';
	const showPreferences = showWhen !== 'never' && promptSettled;
	const visible = actions.length > 0 || showPreferences;

	return (
		<TriggerRoot
			defaultPosition={defaultPosition}
			onPositionChange={onPositionChange}
			persistPosition={persistPosition}
			visible={visible}
		>
			<TriggerToolbar
				actions={actions}
				ariaLabel={ariaLabel}
				className={className}
				noStyle={noStyle}
				orientation={orientation}
				preferences={preferences}
				showPreferences={showPreferences}
				size={size}
				style={style}
			/>
		</TriggerRoot>
	);
};

ConsentDialogTriggerToolbar.displayName = 'ConsentDialogTriggerToolbar';
