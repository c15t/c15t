/**
 * `@c15t/react-native` — React Native bindings for the c15t native consent
 * cores.
 *
 * The consent kernel runs natively: Swift on iOS, Kotlin on Android. This
 * package owns the boundary and nothing else. It reads the native snapshot,
 * forwards the subject's decisions, and renders what the core says. It does not
 * evaluate policy, store records, queue writes, or keep a second copy of consent
 * state in JavaScript.
 *
 * Three layers, top down:
 *
 * - {@link C15tProvider} attaches to the native instance the app already booted
 *   and checks the protocol handshake.
 * - The hooks ({@link useConsent}, {@link useIsAllowed},
 *   {@link useConsentStatus}, {@link useConsentActions},
 *   {@link useConsentSelector}) subscribe to the slice a component actually
 *   reads, so a consent change rerenders the components whose value moved.
 * - The headless components (`ConsentGate`, `ConsentReady`, `ConsentPrompt`)
 *   call a function with that slice, for apps that build their own UI.
 *
 * @example
 * ```tsx
 * import {
 *     C15tProvider,
 *     ConsentGate,
 *     useConsentActions,
 *     useIsAllowed,
 * } from '@c15t/react-native';
 *
 * function Analytics() {
 *     const allowed = useIsAllowed('measurement');
 *
 *     return allowed ? <VendorInit /> : null;
 * }
 * ```
 */

export {
	ConsentBanner,
	ConsentDialog,
	ConsentIabDrawer,
	ConsentPreferences,
	CONSENT_COLOR_SCHEMES,
	CONSENT_THEME_PARTS,
	createConsentTheme,
	darkTheme,
	isConsentThemePart,
	lightTheme,
	resolveConsentColorScheme,
	seedConsentIabSelection,
	useConsentStyles,
} from './components';
export type {
	ConsentBannerProps,
	ConsentColorScheme,
	ConsentDialogProps,
	ConsentPartStyles,
	ConsentPreferencesProps,
	ConsentIabCopy,
	ConsentIabCopyOverrides,
	ConsentIabDialogData,
	ConsentIabDisplayConsentRow,
	ConsentIabDisplayModel,
	ConsentIabDrawerRootProps,
	ConsentIabDisplayRow,
	ConsentIabDisplayRowKind,
	ConsentIabDisplayStackRow,
	ConsentIabDisplayToggle,
	ConsentIabInitialSelection,
	ConsentIabProcessedFeature,
	ConsentIabProcessedPurpose,
	ConsentIabProcessedSpecialFeature,
	ConsentIabProcessedStack,
	ConsentIabProcessedVendor,
	ConsentIabSelection,
	ConsentIabTab,
	ConsentIabVendorId,
	ConsentStyles,
	ConsentTheme,
	ConsentThemeColors,
	ConsentThemeMotion,
	ConsentThemeOptions,
	ConsentThemePart,
	ConsentThemeRadius,
	ConsentThemeSpacing,
	ConsentThemeTypography,
	ConsentTypeStyle,
} from './components';
export { ConsentGate, ConsentPrompt, ConsentReady } from './headless';
export type {
	ConsentGateProps,
	ConsentGateState,
	ConsentPromptProps,
	ConsentPromptState,
	ConsentReadyProps,
	ConsentReadyState,
} from './headless';
export { useC15tBootstrap, useConsent } from './hooks';
export { useConsentActions } from './hooks';
export type { ConsentActions } from './hooks';
export { useConsentSelector } from './hooks';
export { useConsentStatus } from './hooks';
export { useConsentSafeArea } from './hooks';
export type { ConsentSafeArea } from './hooks';
export { useConsentDecision, useIsAllowed } from './hooks';
export { useIsTrackingAllowed, useTrackingAuthorization } from './hooks';
export {
	denyAllSnapshot,
	INVALID_NATIVE_SNAPSHOT_CODE,
} from './lib/deny-all-snapshot';
export {
	isPlatformTrackingSatisfied,
	isTrackingPermitted,
} from './lib/tracking';
export {
	categoryDecision,
	isCategoryAllowed,
	isConsentStatusEqual,
	isSnapshotReady,
	isPromptOwed,
	isStatusPromptOwed,
	selectConsentStatus,
	shallowEqual,
} from './lib/selectors';
export type { ConsentDecision, ConsentStatus } from './lib/selectors';
export {
	C15tProtocolMismatchError,
	createConsentClient,
	getConsentClient,
	getNativeC15t,
	getNativeC15tEvents,
	hasNativeC15tSurface,
	NativeBridgeError,
	NativeC15tUnavailableError,
} from './native';
export type {
	ConsentClient,
	NativeC15tTurboModule,
	NativeEventSubscription,
	NativeEventsLike,
	SnapshotEquality,
	SnapshotSelector,
} from './native';
export * from './protocol';
export {
	C15tProvider,
	ConsentClientContext,
	useConsentClient,
} from './provider';
export type { C15tProviderProps } from './provider';
export type { ConsentSafeAreaInsets } from './provider';

// The Codegen spec is exported as types only. Importing it for values would
// resolve the TurboModule at import time, which only works inside a React
// Native runtime with the New Architecture enabled.
export type { Spec as NativeC15tSpec } from './specs/NativeC15t';
