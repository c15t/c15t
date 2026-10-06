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
 * Each function lives in its own module so a bundle keeps only what its
 * adapter calls, where that adapter calls it: the rules and navigation sit
 * on first load, a save can stay with a lazily loaded dialog. They are
 * arrows because they ship to every adapter.
 */

// oxlint-disable-next-line oxc/no-barrel-file -- The subpath's public interface; each module stays separately placeable.
export { saveConsentBlanket } from './blanket';
export type { ConsentSurfaceIAB } from './blanket';
export { saveIABConsentSurface } from './iab-save';
export {
	hasConsentPreferences,
	hasConsentUI,
	showConsentSurface,
} from './rules';
export { saveConsentSurface } from './save';
