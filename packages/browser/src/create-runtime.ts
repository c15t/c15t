/**
 * The page runtime for the ESM entries.
 *
 * The script loader, network blocker, data clearing and a `consentSource`
 * connection load on demand, each only when configured, so a page without
 * them never downloads them. The host's bundler names their chunks, so a
 * page that configures `scripts` and wants the loader in its first load
 * preloads that chunk itself.
 *
 * The script-tag builds swap this module for `create-runtime-static.ts`
 * (see `rslib.config.ts`): one file has nowhere to load a chunk from, and
 * inlined `import()`s only add bytes.
 */
import { watchRevocationReload } from '@c15t/core';
import { createIframeBlocker } from '@c15t/core/modules/iframe-blocker';
import { createPersistence } from '@c15t/core/modules/persistence';
import { createWindowDebug } from '@c15t/core/modules/window-debug';
import type { ConsentRuntime, ConsentRuntimeOptions } from '@c15t/core/runtime';
import {
	createConsentRuntimeWith,
	mountRuntimeIAB,
	onDemandRuntimeModules,
} from '@c15t/core/runtime/on-demand';

/**
 * Creates the page's consent runtime.
 *
 * @param options - The runtime configuration.
 * @returns The runtime, not started.
 */
export const createBrowserRuntime = function createBrowserRuntime(
	options: ConsentRuntimeOptions
): ConsentRuntime {
	return createConsentRuntimeWith(options, {
		...onDemandRuntimeModules,
		createIframeBlocker,
		createPersistence,
		createWindowDebug,
		mountIAB: mountRuntimeIAB,
		watchRevocationReload,
	});
};
