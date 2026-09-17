/**
 * The bridge layer: the module lookup and the client built on it.
 *
 * Exported for apps that need the client outside React, for a test harness that
 * drives a mock module, and for an Expo module or native init hook that wants
 * the same client the provider uses.
 */

export { createConsentClient, getConsentClient } from './client';
export type {
	ConsentClient,
	SnapshotEquality,
	SnapshotSelector,
} from './client';
export { NativeBridgeError } from './bridge-error';
export { C15tProtocolMismatchError } from './protocol-mismatch-error';
export {
	getNativeC15t,
	getNativeC15tEvents,
	hasNativeC15tSurface,
	NativeC15tUnavailableError,
} from './module';
export type {
	NativeC15tTurboModule,
	NativeEventSubscription,
	NativeEventsLike,
} from './module';
