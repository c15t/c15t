/**
 * IAB saves from a consent surface.
 */

import type { ConsentKernel, SaveResult } from '../types';
import { actions, beginAction, isOpen } from './rules';

const logSaveError = (error: unknown): void => {
	console.error('[c15t] Saving the IAB choice failed.', error);
};

/**
 * Close an IAB surface in the task that handled the click, then save.
 *
 * An IAB choice commits once its TC string is encoded, which can wait on
 * the TCF library chunk but never on the backend. The surface comes back
 * only when that local step recorded nothing (the vendor list failed to
 * load, or the policy changed underneath) and no newer action or navigation
 * came first, so the visitor can try again.
 *
 * A failed save is reported once, through `onError`, and resolves
 * `{ ok: false }`, so a surface needs no handler of its own.
 *
 * @param kernel - The kernel the CMP records into.
 * @param save - Applies any blanket and runs the CMP handle's `save()`.
 * @param onError - Receives what `save` threw. Defaults to `console.error`.
 * @returns `{ ok: true }` when `save` succeeded and recorded a new IAB
 * authority. The handle refuses an authority for a policy that changed while
 * it encoded.
 */
export const saveIABConsentSurface = async (
	kernel: ConsentKernel,
	save: () => Promise<void> | void,
	onError: (error: unknown) => void = logSaveError
): Promise<SaveResult> => {
	const action = beginAction(kernel);
	const before = kernel.getSnapshot();
	const surface = before.activeUI;
	const open = isOpen(surface);
	let recorded = false;
	let failed = false;
	if (open) {
		kernel.set.activeUI('none');
	}
	try {
		await save();
	} catch (error) {
		failed = true;
		onError(error);
	} finally {
		const after = kernel.getSnapshot();
		recorded = after.iab?.authority !== before.iab?.authority;
		if (
			open &&
			!recorded &&
			actions.get(kernel) === action &&
			after.activeUI === 'none'
		) {
			kernel.set.activeUI(surface);
		}
	}
	return { ok: recorded && !failed };
};
