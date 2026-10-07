import { hosted } from '@c15t/core';

import type { CreateConsentClientContext } from './client-base';
import { createGlobalWith } from './global-base';
import type { C15tGlobalBase } from './global-base';
import { createHostedConsentClient } from './hosted-client';

/** The global API installed by the hosted browser bundle. */
export interface HostedC15tGlobal extends C15tGlobalBase {
	/** Hosted transport factory for `init({ mode: c15t.hosted({ url }) })`. */
	hosted: typeof hosted;
}

/**
 * Build the global API with the hosted transport.
 *
 * @param context - Entry-point wiring (UI mounter, package name).
 * @returns The API, not yet installed on `window`.
 * @throws {Error} When the script tag names a different mode.
 * @internal
 */
export const createHostedGlobal = function createHostedGlobal(
	context: CreateConsentClientContext = {}
): HostedC15tGlobal {
	return Object.assign(
		createGlobalWith(
			{ ...context, pkg: context.pkg ?? '@c15t/browser/hosted' },
			createHostedConsentClient,
			'hosted'
		),
		{ hosted }
	);
};
