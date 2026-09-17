/**
 * Declarative category gate for apps that bring their own UI.
 */

import type { AllConsentNames } from '@c15t/core';
import type { ReactNode } from 'react';

import type { ConsentActions } from '../hooks/use-consent-actions';
import { useConsentActions } from '../hooks/use-consent-actions';
import { useIsAllowed } from '../hooks/use-is-allowed';

/**
 * What the gate hands its children.
 */
export interface ConsentGateState {
	/** Category that was checked, echoed for multi-gate trees. */
	readonly category: AllConsentNames;
	/** Actions, so a gate can offer an ask without a second hook call. */
	readonly actions: ConsentActions;
}

/**
 * Props for {@link ConsentGate}.
 */
export interface ConsentGateProps {
	/** Category to gate on. */
	readonly category: AllConsentNames;
	/**
	 * Rendered only while the category is allowed.
	 *
	 * @param state - The gated category plus the actions.
	 * @returns Anything.
	 */
	readonly children: (state: ConsentGateState) => ReactNode;
	/** Rendered while the category is not allowed. Defaults to nothing. */
	readonly fallback?: ReactNode;
}

/**
 * Render children only while a category is allowed.
 *
 * The component subscribes to that one boolean, so an unrelated consent change
 * cannot rerender it, and it never renders before the native core has decided:
 * the common bug where an SDK initializes on a cold start because the check ran
 * against an empty in-memory state.
 *
 * @example
 * ```tsx
 * <ConsentGate category="marketing">
 *     {() => <AdConsentProvider />}
 * </ConsentGate>
 * ```
 *
 * @param props - Gate props.
 * @param props.category - Category to gate on.
 * @param props.children - Rendered while the category is allowed.
 * @param props.fallback - Rendered while it is not.
 * @returns The gated children, or the fallback.
 */
export const ConsentGate = ({
	category,
	children,
	fallback = null,
}: ConsentGateProps): ReactNode => {
	const allowed = useIsAllowed(category);
	const actions = useConsentActions();

	return allowed ? children({ actions, category }) : fallback;
};
