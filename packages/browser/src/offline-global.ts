import type { CreateConsentClientContext } from './client-base';
import { createGlobalWith } from './global-base';
import type { C15tGlobalBase } from './global-base';
import { createOfflineConsentClient } from './offline-client';
import { offline } from './transports/offline';

/** The global API installed by the offline browser bundle. */
export interface OfflineC15tGlobal extends C15tGlobalBase {
	/** Offline transport factory for `init({ mode: c15t.offline() })`. */
	offline: typeof offline;
}

/**
 * Build the global API with the offline transport.
 *
 * @param context - Entry-point wiring (UI mounter, package name).
 * @returns The API, not yet installed on `window`.
 * @throws {Error} When the script tag names a different mode.
 * @internal
 */
export const createOfflineGlobal = function createOfflineGlobal(
	context: CreateConsentClientContext = {}
): OfflineC15tGlobal {
	return Object.assign(
		createGlobalWith(
			{ ...context, pkg: context.pkg ?? '@c15t/browser/offline' },
			createOfflineConsentClient,
			'offline'
		),
		{ offline }
	);
};
