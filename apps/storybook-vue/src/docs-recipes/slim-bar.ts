// #region docs:slim-bar title="src/consent-options.ts"
import type { C15tVuePluginOptions } from 'c15t/vue/vue-plugin';

import './slim-bar.css';

/**
 * Spread into the options you pass to `app.use(c15tVue, ...)`. The bar keeps
 * the stock markup and actions; the slot classes put it on one row.
 */
export const slimBar = {
	components: {
		banner: {
			card: { class: 'slim-bar' },
			header: { class: 'slim-bar__text' },
		},
	},
	presentation: {
		prompt: { position: 'bottom', variant: 'bar' },
	},
} satisfies C15tVuePluginOptions;
// #endregion docs:slim-bar
