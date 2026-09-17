/**
 * Pure reads over a native snapshot.
 *
 * These are the only functions in this package that decide anything about a
 * permission, and they decide nothing: they read `effectivePermissions` and
 * apply the two lifecycle flags. The native cores own the state, and
 * `@c15t/core` is imported here for its types and constant tables, never as a
 * second kernel.
 */

import type {
	AllConsentNames,
	KernelActiveUI,
	PromptRequirement,
} from '@c15t/core';

import type { ConsentSnapshot } from '../protocol';

/**
 * The lifecycle slice a gate needs before it trusts a permission.
 *
 * `ready` covers hydration, `policyPending` covers the first init. A prompt
 * that renders while either is unset flashes the wrong surface, so the status
 * object is the natural thing for a shell to subscribe to.
 */
export interface ConsentStatus {
	/** `true` once the stored envelope finished hydrating. */
	readonly ready: boolean;
	/** `true` until the first init resolves a policy. */
	readonly policyPending: boolean;
	/** Surface to render: `banner`, `dialog`, `none`, or `null`. */
	readonly activeUI: KernelActiveUI;
	/** Interaction the policy still requires. */
	readonly promptRequirement: PromptRequirement;
}

/**
 * Whether a category may run right now.
 *
 * `necessary` always runs. While hydration or the first init is outstanding the
 * optional categories read `false`, because a snapshot that has not resolved
 * yet is not permission to process. Otherwise the native evaluation is taken
 * verbatim: no default-on, no model sniffing.
 *
 * @param snapshot - Snapshot to read.
 * @param category - Category to check.
 * @returns `true` when the category may run.
 */
export const isCategoryAllowed = function isCategoryAllowed(
	snapshot: ConsentSnapshot,
	category: AllConsentNames
): boolean {
	if (category === 'necessary') {
		return true;
	}

	if (!snapshot.ready || snapshot.policyPending) {
		return false;
	}

	return snapshot.effectivePermissions[category] === true;
};

/**
 * Select the lifecycle slice of a snapshot.
 *
 * The result is a fresh object, so pair it with {@link isConsentStatusEqual} or
 * every snapshot event would rerender the subscriber.
 *
 * @param snapshot - Snapshot to read.
 * @returns The four fields a shell gates on.
 */
export const selectConsentStatus = function selectConsentStatus(
	snapshot: ConsentSnapshot
): ConsentStatus {
	return {
		activeUI: snapshot.activeUI,
		policyPending: snapshot.policyPending,
		promptRequirement: snapshot.promptRequirement,
		ready: snapshot.ready,
	};
};

/**
 * Compare two {@link ConsentStatus} values field by field.
 *
 * `promptRequirement` is compared by its discriminant and reason rather than by
 * object identity, because the native payload reparses into a fresh object on
 * every snapshot change.
 *
 * @param current - Value the subscriber rendered last.
 * @param next - Value the subscriber would render now.
 * @returns `true` when nothing a gate reads has changed.
 */
export const isConsentStatusEqual = function isConsentStatusEqual(
	current: ConsentStatus,
	next: ConsentStatus
): boolean {
	return (
		current.activeUI === next.activeUI &&
		current.policyPending === next.policyPending &&
		current.promptRequirement.kind === next.promptRequirement.kind &&
		(current.promptRequirement.kind === 'none' ||
			next.promptRequirement.kind === 'none' ||
			current.promptRequirement.reason === next.promptRequirement.reason) &&
		current.ready === next.ready
	);
};

/**
 * Whether the app owes the subject an interaction right now.
 *
 * True only once the snapshot is trustworthy: a pending policy has not decided
 * whether a prompt is required, and rendering one that early is the flash this
 * package exists to avoid.
 *
 * @param status - Status slice to read.
 * @returns `true` when a prompt surface should be shown.
 */
export const isStatusPromptOwed = function isStatusPromptOwed(
	status: ConsentStatus
): boolean {
	return (
		status.ready &&
		!status.policyPending &&
		status.promptRequirement.kind !== 'none'
	);
};

/**
 * Whether the app owes the subject an interaction right now.
 *
 * @param snapshot - Snapshot to read.
 * @returns `true` when a prompt surface should be shown.
 */
export const isPromptOwed = function isPromptOwed(
	snapshot: ConsentSnapshot
): boolean {
	return isStatusPromptOwed(selectConsentStatus(snapshot));
};

/**
 * Compare two values field by field for one level down.
 *
 * Snapshot slices are flat, so a one-level comparison is enough and cheaper
 * than a structural walk.
 *
 * @param current - Value the subscriber rendered last.
 * @param next - Value the subscriber would render now.
 * @returns `true` when every own key holds an identical value.
 */
export const shallowEqual = function shallowEqual<T>(
	current: T,
	next: T
): boolean {
	if (Object.is(current, next)) {
		return true;
	}

	if (
		typeof current !== 'object' ||
		typeof next !== 'object' ||
		current === null ||
		next === null
	) {
		return false;
	}

	const currentKeys = Object.keys(current);
	const nextKeys = Object.keys(next);

	if (currentKeys.length !== nextKeys.length) {
		return false;
	}

	const nextRecord = next as Record<string, unknown>;

	return currentKeys.every(
		(key) =>
			Object.hasOwn(nextRecord, key) &&
			Object.is((current as Record<string, unknown>)[key], nextRecord[key])
	);
};
