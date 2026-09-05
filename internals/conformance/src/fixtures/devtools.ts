import { custom } from '@c15t/core';
import type { KernelConfig, KernelTransport } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
import { resolvePolicyRules } from '@c15t/schema/types';

export const devToolsCategories = [
	'necessary',
	'measurement',
	'marketing',
] as const;
export const getDevToolsCategories = () => devToolsCategories;

export const devToolsPrefetch = {
	initialLocation: { countryCode: 'CA', regionCode: 'QC' },
	initialOverrides: { country: 'CA', language: 'en', region: 'QC' },
	initialPolicyResolution: resolvePolicyRules({
		rules: [
			{
				categories: ['measurement', 'marketing'],
				id: 'devtools-conformance',
				match: { isDefault: true },
				model: 'opt-in',
				prompt: 'choice',
			},
		],
	}),
} satisfies KernelConfig;

const transport: KernelTransport = {
	init: () =>
		Promise.resolve({
			location: devToolsPrefetch.initialLocation,
			policyResolution: devToolsPrefetch.initialPolicyResolution,
		}),
	save: () => Promise.resolve({ ok: true }),
};

export const devToolsScripts: Script[] = [
	{ callbackOnly: true, category: 'necessary', id: 'essential-callback' },
	{
		anonymizeId: false,
		category: 'measurement',
		id: 'analytics-fixture',
		src: 'data:text/javascript,void%200',
	},
	{
		anonymizeId: false,
		category: 'marketing',
		id: 'retained-pixel',
		persistAfterConsentRevoked: true,
		textContent: 'void 0;',
	},
];

/** No external requests or persisted consent in comparison stories. */
export const devToolsProviderOptions = {
	consentCategories: [...devToolsCategories],
	mode: custom(transport),
	persistence: false,
	prefetch: devToolsPrefetch,
	reloadOnConsentRevoked: false,
	scripts: devToolsScripts,
};
