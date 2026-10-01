// #region docs:class-names-emotion title="src/consent-components.ts"
import { css } from '@emotion/css';
import type { ConsentProviderOptions } from 'c15t/react';

const card = css({
	border: '3px solid rgb(234 88 12)',
	borderRadius: 4,
});

/** Pass as `components` in your ConsentProvider options. */
export const components: ConsentProviderOptions['components'] = {
	banner: {
		card: { className: card },
	},
};
// #endregion docs:class-names-emotion
