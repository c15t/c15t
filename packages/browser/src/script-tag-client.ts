/**
 * The client behind `c15t.headless.js` and `c15t.iab.js`, which carry
 * every transport so a script tag can pick one by name with `data-mode`.
 * ES module entries take a factory instead (`./client`).
 */
import { hosted, offline } from '@c15t/core';
import { manifest } from '@c15t/core/transports/manifest-browser';

import { createConsentClientWith } from './client-base';
import type { CreateConsentClientContext, ResolvedMode } from './client-base';
import { resolveRules } from './policy-rules';
import type {
	ConsentClient,
	ConsentModeName,
	ScriptTagClientOptions,
} from './types';

const defaultModeName = function defaultModeName(
	options: ScriptTagClientOptions
): ConsentModeName {
	if (options.manifest || options.manifestURL) {
		return 'manifest';
	}
	return options.backendURL ? 'hosted' : 'offline';
};

const resolveMode = function resolveMode(
	options: ScriptTagClientOptions
): ResolvedMode {
	if (typeof options.mode === 'function') {
		const { kind } = options.mode;
		return {
			factory: options.mode,
			name:
				kind === 'hosted' || kind === 'offline' || kind === 'manifest'
					? kind
					: 'custom',
		};
	}
	const name = options.mode ?? defaultModeName(options);
	if (name === 'hosted') {
		if (!options.backendURL) {
			throw new Error(
				'@c15t/browser: hosted mode needs `backendURL` (or data-backend-url on the script tag).'
			);
		}
		return { factory: hosted({ backendURL: options.backendURL }), name };
	}
	if (name === 'manifest') {
		return {
			factory: manifest({
				backendURL: options.backendURL,
				inputs: {
					country: options.overrides?.country,
					region: options.overrides?.region,
				},
				manifestURL: options.manifestURL,
				snapshot: options.manifest,
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
 * Create a script-tag client without starting it. `mode` may be a name.
 *
 * @param options - Client options from the tag and queued `config` calls.
 * @param context - Entry-point wiring.
 * @returns The client. Call `start()` to resolve the policy and mount.
 * @throws {Error} When the selected mode or policy presets are invalid.
 * @internal
 */
export const createScriptTagConsentClient =
	function createScriptTagConsentClient(
		options: ScriptTagClientOptions = {},
		context: CreateConsentClientContext = {}
	): ConsentClient {
		return createConsentClientWith(
			options,
			resolveMode(options),
			resolveRules(options.policyRules),
			context
		);
	};
