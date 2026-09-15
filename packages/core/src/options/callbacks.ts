import type { ConsentState } from '../consent/compliance';
import type { KernelEvent } from '../types';

/**
 * A generic type for callback functions that can accept an argument of type T.
 *
 * @public
 */
export type Callback<T = void> = (arg: T) => void;

/**
 * Payload types for the callbacks
 */
export interface OnErrorPayload {
	error: string;
}

/**
 * Payload of {@link Callbacks.onChoiceRecorded}: the snapshot after the
 * action, the categories it confirmed, when it happened and, when the
 * attributed surface has a recorded impression, `timeToDecisionMs`.
 */
export type OnChoiceRecordedPayload = Omit<
	Extract<KernelEvent, { type: 'choice:recorded' }>,
	'type'
>;
export type OnPermissionsChangedPayload = Omit<
	Extract<KernelEvent, { type: 'permissions:changed' }>,
	'type'
>;
/**
 * Payload of {@link Callbacks.onSurfaceShown}: which prompt surface became
 * visible, the epoch milliseconds of the impression and the snapshot it
 * rendered from.
 */
export type OnSurfaceShownPayload = Omit<
	Extract<KernelEvent, { type: 'surface:shown' }>,
	'type'
>;

export interface Callbacks {
	/** Runs only for an explicit accept, reject or save action. */
	onChoiceRecorded?: Callback<OnChoiceRecordedPayload>;
	/** Runs only when effective permissions change. */
	onPermissionsChanged?: Callback<OnPermissionsChangedPayload>;
	/**
	 * Runs when the banner or the dialog becomes visible: once per opening,
	 * never for a hydrated record or a server render. Count these as
	 * impressions; `onChoiceRecorded` counts decisions.
	 *
	 * @param payload - The surface, its impression time and the snapshot.
	 */
	onSurfaceShown?: Callback<OnSurfaceShownPayload>;
	/**
	 * Called when an error occurs.
	 *
	 * @param payload - The payload containing the error information
	 */
	onError?: Callback<OnErrorPayload>;

	/**
	 * Called before the page reloads when consent is revoked.
	 *
	 * @remarks
	 * This callback is triggered when `reloadOnConsentRevoked` is enabled
	 * and a user revokes consent that was previously granted. Use this
	 * callback to show a loading state or perform any cleanup before
	 * the page reloads.
	 *
	 * Note: This callback runs synchronously before the reload, so
	 * avoid long-running operations.
	 *
	 * @param payload - The payload containing the new consent preferences
	 */
	onBeforeConsentRevocationReload?: Callback<{ preferences: ConsentState }>;
}
