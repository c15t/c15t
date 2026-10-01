// oxlint-disable sort-keys -- PostCSS runs plugins in the order listed.
// #region docs:postcss-config title="postcss.config.mjs"
export default {
	plugins: {
		'@c15t/browser/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};
// #endregion docs:postcss-config
