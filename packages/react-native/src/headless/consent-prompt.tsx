/**
 * Prompt surface slot for apps that bring their own UI.
 */

import type { KernelActiveUI, PromptRequirement } from '@c15t/core';
import type { ReactNode } from 'react';

import type { ConsentActions } from '../hooks/use-consent-actions';
import { useConsentActions } from '../hooks/use-consent-actions';
import { useConsentStatus } from '../hooks/use-consent-status';
import { isStatusPromptOwed } from '../lib/selectors';

/**
 * What the prompt slot hands its children.
 */
export interface ConsentPromptState {
	/** Surface the policy resolved to: `banner`, `dialog`, or `null`. */
	readonly activeUI: KernelActiveUI;
	/** Interaction still owed, so a shell can pick its own layout. */
	readonly promptRequirement: PromptRequirement;
	/** Actions wired to the native core. */
	readonly actions: ConsentActions;
}

/**
 * Props for {@link ConsentPrompt}.
 */
export interface ConsentPromptProps {
	/**
	 * Rendered while an interaction is owed.
	 *
	 * @param state - The surface to render, the outstanding requirement, and
	 *   the actions.
	 * @returns Anything.
	 */
	readonly children: (state: ConsentPromptState) => ReactNode;
	/** Rendered when nothing is owed. Defaults to nothing. */
	readonly fallback?: ReactNode;
}

/**
 * Render the app's own prompt only while the policy requires one.
 *
 * The built-in surfaces live in `@c15t/react-native/components`; this is the
 * slot for an app that designs its own banner and dialog. It reads the four
 * lifecycle fields, so a snapshot event that changes neither the surface nor
 * the requirement leaves it alone.
 *
 * @example
 * ```tsx
 * <ConsentPrompt>
 *     {({ actions, activeUI, promptRequirement }) =>
 *         activeUI === 'banner' ? (
 *             <MyBanner onAccept={actions.acceptAll} requirement={promptRequirement} />
 *         ) : (
 *             <MyDialog onAccept={actions.acceptAll} />
 *         )
 *     }
 * </ConsentPrompt>
 * ```
 *
 * @param props - Prompt props.
 * @param props.children - Rendered while a prompt is owed.
 * @param props.fallback - Rendered when nothing is owed.
 * @returns The prompt children while one is owed, or the fallback.
 */
export const ConsentPrompt = ({
	children,
	fallback = null,
}: ConsentPromptProps): ReactNode => {
	const status = useConsentStatus();
	const actions = useConsentActions();

	if (!isStatusPromptOwed(status)) {
		return fallback;
	}

	return children({
		actions,
		activeUI: status.activeUI,
		promptRequirement: status.promptRequirement,
	});
};
