// #region docs:slot title="app/app.config.ts"
// Tailwind scans `app/`, so keep slot classes here rather than in
// nuxt.config.ts.
export default defineAppConfig({
	c15t: {
		components: {
			banner: {
				root: { class: 'p-[7px] dark:p-[11px]' },
			},
		},
	},
});
// #endregion docs:slot
