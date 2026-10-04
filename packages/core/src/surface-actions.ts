/**
 * Surface actions: what a visitor's click does to the consent surfaces.
 *
 * Every adapter shows a banner and a preference dialog, and every one has
 * to answer the same questions: does this rule owe any UI at all, which
 * surface shows once a choice is recorded, when does a save close the
 * surface it came from, and when does an older save lose to a newer click.
 * This module answers them once, over the kernel, so React, Vue, Svelte,
 * Astro and `@c15t/browser` only wrap it in their own idiom.
 *
 * The rules:
 *
 * - A surface closes in the task that handled the click, as soon as the
 *   kernel has recorded the choice locally. The backend request runs after
 *   and its outcome never reopens the surface; a failed request stays in
 *   the kernel's outbox for replay.
 * - A save that records nothing new (an unchanged selection) closes once it
 *   resolves successfully, unless the visitor navigated, a newer action
 *   started, or the policy changed underneath it.
 * - The surface left behind is the one the kernel itself derives: the
 *   banner while a choice or notice is still owed, nothing while the policy
 *   is pending, the resolution failed, or nothing is owed.
 * - Explicit navigation ({@link showConsentSurface}) supersedes every
 *   pending action on that kernel, even when it targets the same surface.
 *
 * Functions are standalone so a bundle keeps only the ones its adapter calls,
 * and written as arrows: this module sits on every adapter's first load.
 */

import { deriveActiveUI } from './derive-surface';
import type {
	ConsentKernel,
	ConsentSnapshot,
	KernelActiveUI,
	SaveResult,
} from './types';

/** The latest action per kernel. A newer action or navigation replaces it. */
const actions = new WeakMap<ConsentKernel, object>();

/** Whether a surface is showing. `null` is the kernel's legacy "none". */
const isOpen = (surface: KernelActiveUI): boolean =>
	surface === 'banner' || surface === 'dialog';

const beginAction = (kernel: ConsentKernel): object => {
	const action = {};
	actions.set(kernel, action);
	return action;
};

/**
 * Whether the resolved rule owes any c15t consent UI.
 *
 * A prompt owes a banner and a preference center; rights owe a way back to
 * preferences. A `none` rule with no rights owes neither, so every surface
 * stays hidden while the permissions it grants apply. `false` until a rule
 * is resolved, and while an external CMP owns the decision.
 *
 * @param snapshot - The kernel snapshot.
 * @returns `true` when c15t should render its banner or dialog.
 */
export const hasConsentUI = (snapshot: ConsentSnapshot): boolean =>
	!snapshot.externalPermissions &&
	snapshot.resolution.status === 'matched' &&
	(snapshot.policyRule.prompt !== 'none' ||
		snapshot.policyRule.rights.length > 0);

/**
 * Whether a preferences control should be offered: c15t owes consent UI, or
 * an external CMP owns the decision and opens its own preferences.
 *
 * @param snapshot - The kernel snapshot.
 * @returns `true` when a "privacy settings" control has somewhere to go.
 */
export const hasConsentPreferences = (snapshot: ConsentSnapshot): boolean =>
	Boolean(snapshot.externalPermissions) || hasConsentUI(snapshot);

/**
 * Show a surface by explicit navigation.
 *
 * Supersedes any pending save on this kernel, so its completion neither
 * closes the surface the visitor just opened nor restores one they closed.
 *
 * @param kernel - The kernel the surface belongs to.
 * @param surface - `'banner'`, `'dialog'` or `'none'`.
 */
export const showConsentSurface = (
	kernel: ConsentKernel,
	surface: KernelActiveUI
): void => {
	beginAction(kernel);
	kernel.set.activeUI(surface);
};

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
			canClose?.() !== false
		) {
			settleSurface(kernel);
		}
		return result;
	});
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
 * @param kernel - The kernel the CMP records into.
 * @param save - Applies any blanket and runs the CMP handle's `save()`.
 * @returns `{ ok: true }` when a new IAB authority was recorded. The handle
 * refuses an authority for a policy that changed while it encoded.
 * @throws {unknown} Whatever `save` throws, after restoring the surface.
 */
export const saveIABConsentSurface = async (
	kernel: ConsentKernel,
	save: () => Promise<void> | void
): Promise<SaveResult> => {
	const action = beginAction(kernel);
	const before = kernel.getSnapshot();
	const surface = before.activeUI;
	const open = isOpen(surface);
	let recorded = false;
	if (open) {
		kernel.set.activeUI('none');
	}
	try {
		await save();
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
	return { ok: recorded };
};

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
