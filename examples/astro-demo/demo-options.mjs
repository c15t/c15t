/**
 * Integration options the example suite needs but the published configs
 * leave out, so `astro.server.config.mjs` and `astro.static.config.mjs`
 * stay copy-paste clean. `astro.config.mjs` merges them in.
 */
export const demoOptions = {
	// #region docs:vendors-option title="astro.config.mjs (partial)"
	vendors: [
		{
			category: 'measurement',
			description: 'Product analytics and session insights.',
			id: 'posthog',
			name: 'PostHog',
			privacyPolicyUrl: 'https://posthog.com/privacy',
		},
		{
			category: 'measurement',
			description: 'Embedded videos.',
			id: 'youtube',
			name: 'YouTube',
			privacyPolicyUrl: 'https://policies.google.com/privacy',
		},
		{
			category: 'marketing',
			description: 'Ad conversion tracking.',
			id: 'x-pixel',
			name: 'X Pixel',
			privacyPolicyUrl: 'https://x.com/en/privacy',
		},
	],
	// #endregion docs:vendors-option
};

const OPTIONS_PREFIX = 'export default ';

/**
 * Merge {@link demoOptions} into the options `c15t()` serializes.
 *
 * The integration writes its options once, into the `virtual:c15t/options`
 * module that the middleware, the components and the browser boot all
 * read, so wrapping that module's loader reaches every consumer without
 * touching the published config. Demo tooling only: it relies on the
 * integration's internal plugin name.
 *
 * @param {import('astro').AstroUserConfig} config - A loaded config.
 * @returns {import('astro').AstroUserConfig} The same config.
 */
export const withDemoOptions = function withDemoOptions(config) {
	config.integrations = (config.integrations ?? []).map((integration) => {
		if (!integration || integration.name !== '@c15t/astro') {
			return integration;
		}
		const setup = integration.hooks['astro:config:setup'];
		return {
			...integration,
			hooks: {
				...integration.hooks,
				'astro:config:setup': (params) =>
					setup({
						...params,
						updateConfig: (update) =>
							params.updateConfig({
								...update,
								vite: update.vite && {
									...update.vite,
									plugins: update.vite.plugins?.map((plugin) =>
										plugin?.name === 'c15t:options'
											? {
													...plugin,
													load(id) {
														const source = plugin.load(id);
														if (!source?.startsWith(OPTIONS_PREFIX)) {
															return source;
														}
														const options = JSON.parse(
															source
																.slice(OPTIONS_PREFIX.length)
																.replace(/;$/u, '')
														);
														return `${OPTIONS_PREFIX}${JSON.stringify({ ...options, ...demoOptions })};`;
													},
												}
											: plugin
									),
								},
							}),
					}),
			},
		};
	});
	return config;
};
