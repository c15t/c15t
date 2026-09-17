/**
 * The native boundary: every type that crosses the TurboModule, plus the
 * version handshake that guards it.
 *
 * Everything here is types and constants. There is no runtime consent logic
 * in this package on purpose — the Swift and Kotlin cores own consent state,
 * and the JavaScript layer renders it.
 */

export type { BootstrapPayload } from './bootstrap';
export type {
	CommitFailureReason,
	CommitIntent,
	CommitResult,
	NativeSavePayload,
} from './commit';
export type { NativeOverrides, NativeOverridesInput } from './overrides';
export { defaultNativeOverrides } from './overrides';
export type {
	TrackingAuthorization,
	TrackingAuthorizationPayload,
} from './tracking';
export {
	parseTrackingAuthorization,
	TRACKING_AUTHORIZATION_STATUSES,
} from './tracking';
export type {
	ConsentSnapshot,
	NativeModel,
	NativeGpcSignal,
	NativePrivacySignals,
	NativeSnapshotError,
	SnapshotResolution,
} from './snapshot';
export {
	describeProtocolMismatch,
	isProtocolVersionSupported,
	MAX_SUPPORTED_PROTOCOL_VERSION,
	MIN_SUPPORTED_PROTOCOL_VERSION,
	PROTOCOL_VERSION,
} from './version';

export {
	KERNEL_OWNED_KEYS,
	SNAPSHOT_KEYS,
	describeSnapshotWireDrift,
} from './wire-shape';
export type { WireDriftOptions } from './wire-shape';

/**
 * Events the native module emits. The payload of each is a JSON string.
 *
 * The core never pushes a snapshot the JavaScript side already holds: it
 * emits the new `revision` and a mounted subscriber pulls with
 * `getSnapshot()`.
 */
export const NATIVE_EVENT_NAMES = ['initialized', 'snapshot', 'error'] as const;

/**
 * One of {@link NATIVE_EVENT_NAMES}.
 */
export type NativeEventName = (typeof NATIVE_EVENT_NAMES)[number];

/**
 * Name the native cores register the TurboModule under, and the name the
 * JavaScript side looks it up by. It is the single agreed identifier between
 * the Codegen spec, the Swift module, and the Android module.
 */
export const NATIVE_C15T_MODULE_NAME = 'C15t';
