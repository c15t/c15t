// #region docs:class-names-css-modules title="src/consent-components.ts"
import type { ConsentProviderOptions } from 'c15t/react';

import styles from './banner.module.css';

/** Pass as `components` in your ConsentProvider options. */
export const components: ConsentProviderOptions['components'] = {
	banner: {
		card: { className: styles.card },
	},
};
// #endregion docs:class-names-css-modules
