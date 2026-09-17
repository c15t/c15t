/**
 * `@c15t/react-native` — React Native bindings for the c15t native consent
 * cores.
 *
 * The consent kernel runs natively (Swift on iOS, Kotlin on Android). This
 * package owns the boundary: the protocol types, the Codegen TurboModule
 * spec, and the provider, hooks, and components layered on top of them.
 *
 * The provider, hooks, and components land in follow-ups. Until then this
 * entry point exports the protocol only, so the native cores and the
 * JavaScript layer can be built against one source of truth.
 *
 * @example
 * ```ts
 * import type { ConsentSnapshot } from '@c15t/react-native';
 * ```
 */

export * from './protocol';

// The Codegen spec is exported as types only. Importing it for values would
// resolve the TurboModule at import time, which only works inside a React
// Native runtime with the New Architecture enabled.
export type { Spec as NativeC15tSpec } from './specs/NativeC15t';
