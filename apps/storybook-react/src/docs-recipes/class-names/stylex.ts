// #region docs:class-names-stylex title="src/consent-components.ts"
import * as stylex from '@stylexjs/stylex';
import type { ConsentProviderOptions } from 'c15t/react';

const styles = stylex.create({
	card: {
		borderColor: 'rgb(22 163 74)',
		borderRadius: 4,
		borderStyle: 'solid',
		borderWidth: 3,
	},
});

/**
 * Pass as `components` in your ConsentProvider options. `stylex.props()`
 * returns `className` and, for dynamic styles, `style`; the slot takes both.
 */
export const components: ConsentProviderOptions['components'] = {
	banner: {
		card: stylex.props(styles.card),
	},
};
// #endregion docs:class-names-stylex
