// #region docs:wisepops-scripts title="src/consent-scripts.ts"
import { wisepops } from '@c15t/integrations/wisepops';

export const scripts = [wisepops({ siteId: 'YOUR_WISEPOPS_SITE_ID' })];

export const experienceScripts = [
	wisepops({
		category: 'experience',
		options: { browserStorage: true },
		siteId: 'YOUR_WISEPOPS_SITE_ID',
	}),
];
// #endregion docs:wisepops-scripts
