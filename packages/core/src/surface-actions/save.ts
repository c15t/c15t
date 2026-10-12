/**
 * Category saves from a consent surface.
 */

import { deriveActiveUI } from '../derive-surface';
import type { ConsentKernel, SaveResult } from '../types';
import { actions, beginAction, isOpen } from './rules';

/** Leave the surface for the one the kernel derives for this snapshot. */
const settleSurface = (kernel: ConsentKernel): void => {
	const snapshot = kernel.getSnapshot();
	const next = deriveActiveUI(snapshot);
	// A save that cleared the prompt already derived this in its commit.
	if (snapshot.activeUI !== next) {
		kernel.set.activeUI(next);
	}
};

/**
 * Run a category save from whichever surface is open and close it.
 *
 * `save` must call the kernel's `commands.save` synchronously (directly or
 * through a draft). When that call records the choice, the surface settles
 * before this returns. Otherwise it settles once `save` resolves `ok`, if
 * `canClose` agrees, no newer action or navigation came first, and the
 * surface is still the one the visitor acted on (a policy change re-derives
 * the surface, so a dialog open across one stays for review).
 *
 * @param kernel - The kernel the choice is recorded in.
 * @param save - Starts the save and returns its result.
 * @param canClose - Extra veto for the deferred close, such as a draft that
 * refused to save.
 * @returns The save's result. A rejected save rejects and closes nothing.
 */
export const saveConsentSurface = (
	kernel: ConsentKernel,
	save: () => Promise<SaveResult>,
	canClose?: () => boolean
): Promise<SaveResult> => {
	const action = beginAction(kernel);
	const before = kernel.getSnapshot();
	const surface = before.activeUI;
	const pending = save();
	if (!isOpen(surface)) {
		return pending;
	}
	const after = kernel.getSnapshot();
	// A choice prompt with nothing to decide records an acknowledgement.
	if (
		after.explicitChoice !== before.explicitChoice ||
		after.vendorChoice !== before.vendorChoice ||
		after.noticeDismissal !== before.noticeDismissal
	) {
		if (actions.get(kernel) === action) {
			settleSurface(kernel);
		}
		return pending;
	}
	return pending.then((result) => {
		if (
			result.ok &&
			actions.get(kernel) === action &&
			kernel.getSnapshot().activeUI === surface &&
			(!canClose || canClose())
		) {
			settleSurface(kernel);
		}
		return result;
	});
};
