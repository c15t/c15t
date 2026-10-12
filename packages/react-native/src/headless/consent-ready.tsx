/**
 * Cold-start gate for apps that bring their own UI.
 */

import type { ReactNode } from 'react';

import type { ConsentActions } from '../hooks/use-consent-actions';
import { useConsentActions } from '../hooks/use-consent-actions';
import { useConsentStatus } from '../hooks/use-consent-status';
import type { ConsentStatus } from '../lib/selectors';

/**
 * What the readiness gate hands its children.
 */
export interface ConsentReadyState {
	/** Lifecycle flags, so a shell can branch without a second subscription. */
	readonly status: ConsentStatus;
	/** Actions for the surface the shell renders. */
	readonly actions: ConsentActions;
}

/**
 * Props for {@link ConsentReady}.
 */
export interface ConsentReadyProps {
	/**
	 * Rendered once the snapshot is trustworthy.
	 *
	 * @param state - The lifecycle flags plus the actions.
	 * @returns Anything.
	 */
	readonly children: (state: ConsentReadyState) => ReactNode;
	/** Rendered until hydration and the first policy resolution are done. */
	readonly fallback?: ReactNode;
}

/**
 * Render children only after the native core has finished starting up.
 *
 * Useful around a screen whose first paint would look wrong under a deny-all
 * snapshot: while `ready` is false or `policyPending` is true, the fallback
 * shows instead.
 *
 * @param props - Gate props.
 * @param props.children - Rendered once the snapshot can be trusted.
 * @param props.fallback - Rendered until then.
 * @returns The children once the snapshot can be trusted, or the fallback.
 */
export const ConsentReady = ({
	children,
	fallback = null,
}: ConsentReadyProps): ReactNode => {
	const status = useConsentStatus();
	const actions = useConsentActions();

	if (!status.ready || status.policyPending) {
		return fallback;
	}

	return children({ actions, status });
};
