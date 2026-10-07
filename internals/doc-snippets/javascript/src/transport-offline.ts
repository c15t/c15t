// #region docs:transport-offline title="src/consent-runtime.ts"
import { offline } from '@c15t/browser';
import { policyRulePresets } from 'c15t';
import { createConsentRuntime } from 'c15t/runtime';

// No backend: rules resolve in the browser and choices stay there. The
// browser does not know the visitor's country, so the page supplies it.
export const runtime = createConsentRuntime({
	mode: offline({
		policyRules: [
			policyRulePresets.europeOptIn(),
			policyRulePresets.worldNone(),
		],
	}),
	overrides: { country: document.documentElement.dataset.country },
});
// #endregion docs:transport-offline
