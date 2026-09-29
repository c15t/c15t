// #region docs:slim-bar title="src/lib/consent-options.ts"
import type { ConsentManagerOptions } from '@c15t/svelte';

import './slim-bar.css';

/**
 * Spread into the options you pass to `ConsentManagerProvider`. The bar
 * keeps the stock markup and actions; the slot classes put it on one row.
 */
export const slimBar = {
	presentation: {
		prompt: { position: 'bottom', variant: 'bar' },
	},
	theme: {
		slots: {
			consentBannerCard: 'slim-bar',
			consentBannerHeader: 'slim-bar__text',
		},
	},
} satisfies Partial<ConsentManagerOptions>;
// #endregion docs:slim-bar
