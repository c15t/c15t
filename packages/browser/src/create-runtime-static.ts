/**
 * The page runtime for the script-tag builds, with every module imported
 * statically. Replaces `create-runtime.ts` there (see `rslib.config.ts`).
 *
 * `createConsentRuntime` from `@c15t/core/runtime` loads the network
 * blocker and data clearing through `import()`. In one file both modules are
 * bundled anyway, so that only adds the on-demand wrapper and mounts them a
 * tick late. This mounts them as it mounts the rest.
 */
import { watchRevocationReload } from '@c15t/core';
import { createClearOnRevocation } from '@c15t/core/modules/clear-on-revocation';
import { createIframeBlocker } from '@c15t/core/modules/iframe-blocker';
import { createNetworkBlocker } from '@c15t/core/modules/network-blocker';
import { createPersistence } from '@c15t/core/modules/persistence';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { createWindowDebug } from '@c15t/core/modules/window-debug';
import type { ConsentRuntime, ConsentRuntimeOptions } from '@c15t/core/runtime';
import { connectConsentSource } from '@c15t/core/runtime/controls';
import {
	createConsentRuntimeWith,
	mountRuntimeIAB,
} from '@c15t/core/runtime/on-demand';

/**
 * Creates the page runtime with every module mounted statically.
 *
 * @param options - The runtime configuration.
 * @returns The runtime handle.
 * @internal
 */
export const createBrowserRuntime = function createBrowserRuntime(
	options: ConsentRuntimeOptions
): ConsentRuntime {
	return createConsentRuntimeWith(options, {
		connectConsentSource,
		createClearOnRevocation,
		createIframeBlocker,
		createNetworkBlocker,
		createPersistence,
		createScriptLoader,
		createWindowDebug,
		mountIAB: mountRuntimeIAB,
		watchRevocationReload,
	});
};
