import type { PresentationAction } from '@c15t/core';

/**
 * Primary actions for the banner, with dismiss promoted on a bare notice.
 *
 * @remarks
 * The resolver's default primary is `customize`, which a notice never
 * offers, so a notice resolves with no primary action. When dismiss is the
 * only control on the surface it is the primary one.
 *
 * @param primaryActions - Primary actions from the resolved presentation.
 * @param orderedActions - Every action the surface renders, in order.
 * @returns The primary actions the banner should style.
 * @internal
 */
export const resolveBannerPrimaryActions = function resolveBannerPrimaryActions<
	Action extends string,
>(
	primaryActions: readonly Action[],
	orderedActions: readonly Action[]
): readonly Action[] {
	if (
		primaryActions.length === 0 &&
		orderedActions.length === 1 &&
		orderedActions[0] === ('dismiss' satisfies PresentationAction)
	) {
		return orderedActions;
	}
	return primaryActions;
};
