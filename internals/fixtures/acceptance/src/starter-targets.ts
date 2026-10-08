/**
 * Starters in `examples/` and how to run each one in production. Starters
 * hold no test code, so everything that points them at the test backend
 * lives here.
 */
export interface StarterTarget {
	id: string;
	/** App directory relative to the repository root. */
	directory: string;
	/** Build command arguments for `bun`. Defaults to `run build`. */
	build?: string[];
	/** Start command arguments for `bun`, serving on `port`. */
	start: (port: number) => string[];
	/** Extra build and start environment for the fixture's backend URL. */
	env?: (backendURL: string) => Record<string, string>;
	/** Routes that show the banner. The first one is polled for readiness. */
	routes: string[];
	/** The server puts the banner in the first HTML response. */
	serverRendered: boolean;
	/**
	 * The starter hardcodes `https://your-project.inth.app`, so the browser's
	 * requests to it go to the fixture instead.
	 */
	placeholderBackend?: boolean;
	/** The starter mounts its own backend on PostgreSQL from `DATABASE_URL`. */
	postgres?: boolean;
	/** Host in the base URL, when the app trusts only a named host. */
	host?: string;
}

export const placeholderBackendURL = 'https://your-project.inth.app';

/**
 * The hosted script tag the plain HTML starter loads. A real backend serves
 * it from `@c15t/browser`; the fixture does not, so the test serves it.
 */
export const hostedScriptURL = `${placeholderBackendURL}/c15t.js`;

const nextStart = (port: number) => ['run', 'start', '--port', String(port)];
const vitePreview = (port: number) => [
	'run',
	'start',
	'--port',
	String(port),
	'--strictPort',
];

export const starterTargets: StarterTarget[] = [
	{
		// The layout passes consent without awaiting it, so the banner mounts
		// after hydration.
		directory: 'examples/nextjs',
		id: 'nextjs',
		routes: ['/'],
		serverRendered: false,
		start: nextStart,
	},
	{
		directory: 'examples/nextjs-pages-router',
		id: 'nextjs-pages-router',
		routes: ['/'],
		serverRendered: true,
		start: nextStart,
	},
	{
		// srvx reads PORT and HOST.
		directory: 'examples/tanstack-start',
		id: 'tanstack-start',
		routes: ['/'],
		serverRendered: true,
		start: () => ['run', 'start'],
	},
	{
		// NUXT_PUBLIC_C15T_BACKEND_URL from the shared environment is where
		// the build downloads the bundled manifest, and at runtime it moves
		// the browser and the module's server routes too.
		directory: 'examples/nuxt',
		id: 'nuxt',
		routes: ['/'],
		serverRendered: true,
		start: () => ['run', 'start'],
	},
	{
		directory: 'examples/nuxt-static',
		id: 'nuxt-static',
		placeholderBackend: true,
		routes: ['/'],
		serverRendered: false,
		start: vitePreview,
	},
	{
		// The Node adapter reads PORT and HOST.
		directory: 'examples/astro',
		id: 'astro',
		routes: ['/'],
		serverRendered: true,
		start: () => ['run', 'start'],
	},
	{
		directory: 'examples/astro-static',
		id: 'astro-static',
		placeholderBackend: true,
		routes: ['/'],
		serverRendered: false,
		start: (port) => [
			'run',
			'start',
			'--host',
			'127.0.0.1',
			'--port',
			String(port),
		],
	},
	{
		directory: 'examples/sveltekit',
		id: 'sveltekit',
		routes: ['/'],
		serverRendered: true,
		start: (port) => [
			'run',
			'start',
			'--host',
			'127.0.0.1',
			'--port',
			String(port),
			'--strictPort',
		],
	},
	...['react', 'vue', 'svelte', 'javascript'].map((id) => ({
		directory: `examples/${id}`,
		id,
		placeholderBackend: true,
		routes: ['/'],
		serverRendered: false,
		start: vitePreview,
	})),
	{
		// Loads the hosted `c15t.js`, which the test serves from this
		// checkout's build. `serve.ts` reads PORT.
		directory: 'examples/html',
		id: 'html',
		placeholderBackend: true,
		routes: ['/'],
		serverRendered: false,
		start: () => ['run', 'start'],
	},
	{
		// Its own backend at `/api/c15t`, which trusts only `localhost`
		// origins. A production server refuses PGlite and needs PostgreSQL.
		directory: 'examples/self-host',
		host: 'localhost',
		id: 'self-host',
		postgres: true,
		routes: ['/'],
		serverRendered: false,
		start: nextStart,
	},
];

export const selectedStarterTargets = function selectedStarterTargets(
	selection = process.env.STARTER_TARGET ?? 'all'
): StarterTarget[] {
	if (selection === 'all') {
		return starterTargets;
	}
	const names = selection.split(',');
	for (const name of names) {
		if (!starterTargets.some((target) => target.id === name)) {
			throw new Error(
				`Unknown STARTER_TARGET ${name}. Choose ${starterTargets.map((target) => target.id).join(', ')} or all.`
			);
		}
	}
	return starterTargets.filter((target) => names.includes(target.id));
};
