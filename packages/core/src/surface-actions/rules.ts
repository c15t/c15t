/**
 * The has-consent-UI rules and explicit navigation, plus the per-kernel
 * action token every surface action shares. Small and on first load in
 * every adapter; the saves live in their own modules so a bundler can keep
 * them with the lazily loaded dialog that calls them.
 */

import type { ConsentKernel, ConsentSnapshot, KernelActiveUI } from '../types';

/**
 * The latest action per kernel. A newer action or navigation replaces it.
 *
 * @internal
 */
export const actions = new WeakMap<ConsentKernel, object>();

/**
 * Whether a surface is showing. `null` is the kernel's legacy "none".
 *
 * @internal
 */
export const isOpen = (surface: KernelActiveUI): boolean =>
	surface === 'banner' || surface === 'dialog';

/** @internal */
export const beginAction = (kernel: ConsentKernel): object => {
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
