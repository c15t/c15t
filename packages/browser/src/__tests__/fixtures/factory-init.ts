/**
 * `init()` from the ES module entries takes a mode factory. These wrappers
 * turn the script-tag options many tests share (`mode: 'offline'`, preset
 * names in `policyRules`) into that factory, so a test describes its
 * policy once.
 */
import { offline } from '@c15t/core';

import { init as initIABEntry } from '../../iab';
import { init as initEntry } from '../../index';
import { resolveRules } from '../../policy-rules';
import type {
	ConsentClient,
	ConsentClientOptions,
	ScriptTagClientOptions,
} from '../../types';

/**
 * Turns script-tag options into ES module options with an offline factory.
 *
 * @param options - Options with an optional mode name and policy rules.
 * @returns The same options with `mode` as a factory.
 */
export const toFactoryOptions = function toFactoryOptions(
	options: ScriptTagClientOptions = {}
): ConsentClientOptions {
	const {
		backendURL: _backendURL,
		manifest: _manifest,
		manifestURL: _manifestURL,
		mode,
		policyRules,
		...rest
	} = options;
	if (typeof mode === 'function') {
		return { ...rest, mode };
	}
	if (mode !== undefined && mode !== 'offline') {
		throw new Error(`factory-init only translates offline mode, not ${mode}.`);
	}
	return {
		...rest,
		mode: offline({ policyRules: resolveRules(policyRules) }),
	};
};

/** `init()` from `@c15t/browser`, with script-tag options. */
export const init = (options?: ScriptTagClientOptions): ConsentClient =>
	initEntry(toFactoryOptions(options));

/** `init()` from `@c15t/browser/iab`, with script-tag options. */
export const initIAB = (options?: ScriptTagClientOptions): ConsentClient =>
	initIABEntry(toFactoryOptions(options));
