/**
 * A configure-once runtime that mounts the module factories its host
 * chooses, for hosts that load some modules on demand.
 *
 * `createConsentRuntime` from `@c15t/core/runtime` mounts
 * `defaultRuntimeModules`, which imports the script loader statically. A
 * page-level host (the script tag, an Astro page) that wants
 * `onDemandRuntimeModules` instead builds its runtime here, so its first
 * load never names the static script loader.
 */
import { assembleConsentRuntime } from './assemble';
import type {
	ConsentRuntime,
	ConsentRuntimeModules,
	ConsentRuntimeOptions,
} from './types';

/**
 * Creates a consent runtime that mounts the given module factories.
 *
 * Same lifecycle as `createConsentRuntime`; only the modules differ.
 *
 * @param options - The runtime configuration.
 * @param modules - The module factories to mount.
 * @returns The runtime handle.
 * @throws {Error} When `mode` is not a transport factory.
 *
 * @example
 * ```ts
 * import { watchRevocationReload } from '@c15t/core';
 * import { createIframeBlocker } from '@c15t/core/modules/iframe-blocker';
 * import { createPersistence } from '@c15t/core/modules/persistence';
 * import { createWindowDebug } from '@c15t/core/modules/window-debug';
 * import {
 *   createConsentRuntimeWith,
 *   onDemandRuntimeModules,
 * } from '@c15t/core/runtime/provider';
 *
 * const runtime = createConsentRuntimeWith(options, {
 *   ...onDemandRuntimeModules,
 *   createIframeBlocker,
 *   createPersistence,
 *   createWindowDebug,
 *   watchRevocationReload,
 * });
 * runtime.start();
 * ```
 */
export const createConsentRuntimeWith = function createConsentRuntimeWith(
	options: ConsentRuntimeOptions,
	modules: ConsentRuntimeModules
): ConsentRuntime {
	return assembleConsentRuntime(options, modules).runtime;
};
