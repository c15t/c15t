/**
 * Picks the configuration for this build.
 *
 * `astro.server.config.mjs` and `astro.static.config.mjs` are the setups the
 * docs publish, and the example suite builds each of them against a backend:
 *
 *   C15T_BACKEND_URL=https://your-project.inth.app bun run --cwd examples/astro-demo build
 *   C15T_BACKEND_URL=https://your-project.inth.app C15T_ASTRO_OUTPUT=static bun run --cwd examples/astro-demo build
 *
 * Without a backend URL, or with `C15T_IAB` or `C15T_UI` set, the showcase
 * build runs instead. See `astro.showcase.config.mjs`.
 */
const showcase =
	!process.env.C15T_BACKEND_URL ||
	process.env.C15T_IAB === '1' ||
	Boolean(process.env.C15T_UI);

const load = async function load() {
	if (showcase) {
		return (await import('./astro.showcase.config.mjs')).default;
	}
	if (process.env.C15T_ASTRO_OUTPUT === 'static') {
		return (await import('./astro.static.config.mjs')).default;
	}
	const config = (await import('./astro.server.config.mjs')).default;
	// Server islands need an adapter, so only the server build gets the
	// cached-page route.
	config.integrations.push({
		hooks: {
			'astro:config:setup': ({ injectRoute }) => {
				injectRoute({
					entrypoint: './src/server-routes/consent-example-cached.astro',
					pattern: '/consent-example-cached',
				});
			},
		},
		name: 'astro-demo:cached-route',
	});
	return config;
};

export default await load();
