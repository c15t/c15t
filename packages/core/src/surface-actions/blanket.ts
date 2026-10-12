/**
 * Accept all and reject all from a consent surface, through the CMP under
 * an IAB policy.
 */

import type { ConsentKernel, SaveResult } from '../types';
import { saveIABConsentSurface } from './iab-save';
import { saveConsentSurface } from './save';

/** The CMP handle calls a blanket action needs. */
export interface ConsentSurfaceIAB {
	acceptAll: () => void;
	rejectAll: () => void;
	save: () => Promise<void>;
}

/**
 * Accept or reject everything from whichever surface is open.
 *
 * Under an IAB policy whose IAB state is not definitively disabled, the
 * blanket goes through the CMP handle, so the TC string records it, and the
 * surface closes as {@link saveIABConsentSurface} describes. Otherwise it
 * is a category save that closes as {@link saveConsentSurface} describes.
 *
 * @param kernel - The kernel the choice is recorded in.
 * @param choice - `'all'` to accept, `'none'` to reject.
 * @param iab - The mounted CMP handle, when there is one.
 * @returns The save's result; `{ ok: false }` under an IAB policy with no
 * handle to record the TC string.
 */
export const saveConsentBlanket = (
	kernel: ConsentKernel,
	choice: 'all' | 'none',
	iab?: ConsentSurfaceIAB | null
): Promise<SaveResult> => {
	const snapshot = kernel.getSnapshot();
	if (snapshot.policyRule.model !== 'iab' || snapshot.iab?.enabled === false) {
		return saveConsentSurface(kernel, () => kernel.commands.save(choice));
	}
	return iab
		? saveIABConsentSurface(kernel, () => {
				iab[choice === 'all' ? 'acceptAll' : 'rejectAll']();
				return iab.save();
			})
		: Promise.resolve({ ok: false });
};
