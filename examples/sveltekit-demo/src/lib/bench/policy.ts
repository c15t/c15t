import { resolvePolicyRules } from 'c15t';

export const BENCHMARK_POLICY_RESOLUTION = resolvePolicyRules({
	countryCode: 'DE',
	regionCode: 'BE',
	rules: [
		{
			categories: ['necessary', 'measurement', 'marketing'],
			id: 'svelte-browser-bench',
			match: { isDefault: true },
			model: 'opt-in',
			prompt: 'choice',
			scopeMode: 'permissive',
		},
	],
});
