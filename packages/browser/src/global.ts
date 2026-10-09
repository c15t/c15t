import { custom, hosted } from '@c15t/core';

import { createConsentClient } from './client';
import type { CreateConsentClientContext } from './client-base';
import { createGlobalWith } from './global-base';
import type { C15tGlobalBase } from './global-base';
import { manifest } from './transports/manifest';
import { offline } from './transports/offline';

export { autoInit, GLOBAL_NAME, installGlobal } from './global-base';
export type { C15tGlobalBase, QueuedCall } from './global-base';

/** The global API installed by the browser bundle with every transport. */
export interface C15tGlobal extends C15tGlobalBase {
	/** Transport factories, for `init({ mode: c15t.hosted({ backendURL }) })`. */
	hosted: typeof hosted;
	offline: typeof offline;
	custom: typeof custom;
	manifest: typeof manifest;
}

/**
 * Build the global API with every transport.
 *
 * @param context - Entry-point wiring (UI mounter, package name).
 * @returns The API, not yet installed on `window`.
 */
export const createGlobal = function createGlobal(
	context: CreateConsentClientContext
): C15tGlobal {
	return Object.assign(createGlobalWith(context, createConsentClient), {
		custom,
		hosted,
		manifest,
		offline,
	});
};
