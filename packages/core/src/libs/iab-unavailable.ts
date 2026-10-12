/**
 * An IAB policy that resolved where no CMP can answer for it.
 *
 * IAB is opt-in in every adapter. When a visitor's policy uses the `iab`
 * model and the backend sent its vendor list, only a mounted CMP can show
 * the IAB banner and record the TC String. Without one the standard
 * surfaces do not handle the model, so the visitor would get no consent UI.
 * Adapters throw {@link IABUnavailableError} instead, from the server
 * render and the browser alike, since both read the same snapshot.
 */
import type { ConsentSnapshot } from '../types';

/** The `code` on every {@link IABUnavailableError}. */
export const IAB_UNAVAILABLE_ERROR_CODE = 'C15T_IAB_UNAVAILABLE';

/**
 * Thrown when a visitor's policy uses IAB TCF and the app has not set IAB
 * up.
 *
 * @example
 * ```ts
 * throw new IABUnavailableError(
 *   'no <IABProvider> is mounted',
 *   "Wrap your IAB consent UI in <IABProvider> from '@c15t/react/iab'"
 * );
 * ```
 */
export class IABUnavailableError extends Error {
	/** Always {@link IAB_UNAVAILABLE_ERROR_CODE}. */
	readonly code = IAB_UNAVAILABLE_ERROR_CODE;

	/**
	 * @param problem - What is missing, completing "but …".
	 * @param fix - How to set IAB up in this adapter, as an imperative.
	 */
	constructor(problem: string, fix: string) {
		super(
			`c15t: this visitor's policy uses IAB TCF, but ${problem}. ${fix}, or remove the IAB model from your policy.`
		);
		this.name = 'IABUnavailableError';
	}
}

/**
 * Whether the snapshot resolved an `iab` policy that only a CMP can show.
 *
 * True when the policy uses the `iab` model and the snapshot carries IAB
 * data: the vendor list, a reference to it, or IAB marked on. A backend
 * that answers `gvl: null` turned IAB off for the request, and an external
 * CMP that owns consent answers for the policy itself; neither needs one.
 * Offline mode without IAB resolves `iab` rules with no vendor list, so it
 * never needs one either.
 *
 * @param snapshot - The kernel snapshot.
 * @returns `true` when the page must mount a CMP for this visitor.
 * @example
 * ```ts
 * if (!isIABConfigured(options.iab) && policyNeedsIAB(kernel.getSnapshot())) {
 *   throw new IABUnavailableError('`iab` is not set', 'Set the `iab` option');
 * }
 * ```
 */
export const policyNeedsIAB = function policyNeedsIAB(
	snapshot: Pick<
		ConsentSnapshot,
		'externalPermissions' | 'iab' | 'policyRule' | 'resolution'
	>
): boolean {
	const { iab } = snapshot;
	return (
		snapshot.resolution.status === 'matched' &&
		snapshot.policyRule.model === 'iab' &&
		snapshot.externalPermissions === undefined &&
		iab !== null &&
		(iab.enabled || iab.gvl !== null || Boolean(iab.gvlReference))
	);
};
