// #region docs:nuxt-gtag-scripts title="app/consent-scripts.ts"
import { gtag } from '@c15t/integrations/google-tag';

export const scripts = [
	// Was gtag: { id: 'G-XXXXXXXXXX' } in nuxt.config.ts. Move a `gtag.config`
	// object to the `config` option unchanged.
	gtag({ category: 'measurement', id: 'G-XXXXXXXXXX' }),
];
// #endregion docs:nuxt-gtag-scripts
