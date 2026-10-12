import { policyRulePresets } from '@c15t/core';
import type { PolicyRule } from '@c15t/core';

import type { ScriptTagClientOptions } from './types';

/**
 * Turn preset names into policy rules.
 *
 * @param policyRules - Rules, preset names, or a mix.
 * @returns Rules only, or `undefined` when none were given.
 * @throws {Error} On a name `policyRulePresets` does not export.
 */
export const resolveRules = function resolveRules(
	policyRules: ScriptTagClientOptions['policyRules']
): PolicyRule[] | undefined {
	if (!policyRules) {
		return undefined;
	}
	return policyRules.map((entry) => {
		if (typeof entry !== 'string') {
			return entry;
		}
		// Own keys only: `'constructor'` would otherwise resolve to Object.
		const preset = Object.hasOwn(policyRulePresets, entry)
			? (policyRulePresets[entry] as () => PolicyRule)
			: undefined;
		if (typeof preset !== 'function') {
			throw new Error(
				`@c15t/browser: unknown policy preset "${entry}". Expected one of ${Object.keys(policyRulePresets).join(', ')}.`
			);
		}
		return preset();
	});
};
