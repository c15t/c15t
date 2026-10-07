import { hosted } from '@c15t/core';

import { createConsentClientWith } from './client-base';
import type { CreateConsentClientContext, ResolvedMode } from './client-base';
import { resolveRules } from './policy-rules';
import { manifest } from './transports/manifest';
import { offline } from './transports/offline';
import type {
	ConsentClient,
	ConsentClientOptions,
	ConsentModeName,
} from './types';

export { custom, hosted } from '@c15t/core';
export { ACTION_ATTRIBUTE, PREFERENCES_HASH } from './client-base';
export type { CreateConsentClientContext, PageAction } from './client-base';
export { resolveRules } from './policy-rules';

const defaultModeName = function defaultModeName(
	options: ConsentClientOptions
): ConsentModeName {
	if (options.manifest || options.manifestURL) {
		return 'manifest';
	}
	return options.backendURL ? 'hosted' : 'offline';
};

const resolveMode = function resolveMode(
	options: ConsentClientOptions
): ResolvedMode {
	if (typeof options.mode === 'function') {
		const { kind } = options.mode;
		return {
			factory: options.mode,
			name: kind === 'hosted' || kind === 'offline' ? kind : 'custom',
		};
	}
	const name = options.mode ?? defaultModeName(options);
	if (name === 'hosted') {
		if (!options.backendURL) {
			throw new Error(
				'@c15t/browser: hosted mode needs `backendURL` (or data-backend-url on the script tag).'
			);
		}
		return { factory: hosted({ url: options.backendURL }), name };
	}
	if (name === 'manifest') {
		return {
			factory: manifest({
				backendURL: options.backendURL,
				inputs: options.overrides,
				manifest: options.manifest,
				manifestURL: options.manifestURL,
			}),
			name,
		};
	}
	return {
		factory: offline({ policyRules: resolveRules(options.policyRules) }),
		name,
	};
};

/**
 * Create the page's consent client without starting it.
 *
 * @param options - Client options.
 * @param context - Entry-point wiring.
 * @returns The client. Call `start()` to resolve the policy and mount.
 * @throws {Error} When the selected mode or policy presets are invalid.
 */
export const createConsentClient = function createConsentClient(
	options: ConsentClientOptions = {},
	context: CreateConsentClientContext = {}
): ConsentClient {
	return createConsentClientWith(
		options,
		resolveMode(options),
		resolveRules(options.policyRules),
		context
	);
};

/**
 * Create and start a client in one call.
 *
 * @param options - Client options.
 * @param context - Entry-point wiring.
 * @returns The started client.
 */
export const initConsentClient = function initConsentClient(
	options: ConsentClientOptions = {},
	context: CreateConsentClientContext = {}
): ConsentClient {
	const client = createConsentClient(options, context);
	client.start();
	return client;
};

export type { Unsubscribe } from '@c15t/core';
