/**
 * The bottom bar design as `c15t()` integration options. The Storybook
 * prerenders the banner with them; the docs publish the region.
 */
export const bottomBarOptions = {
	// #region docs:bottom-bar title="astro.config.mjs (partial)"
	presentation: {
		prompt: { position: 'bottom', variant: 'bar' },
	},
	// #endregion docs:bottom-bar
} as const;
