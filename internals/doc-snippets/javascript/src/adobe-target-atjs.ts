// #region docs:adobe-target-atjs title="src/consent-scripts.ts"
import { adobeTarget } from '@c15t/integrations/adobe-target';

export const scripts = [
	adobeTarget({
		mode: 'atjs',
		scriptUrl: '/scripts/at.js',
		targetGlobalSettings: {
			secureOnly: true,
		},
	}),
];
// #endregion docs:adobe-target-atjs
