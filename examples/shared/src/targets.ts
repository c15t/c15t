export interface ExampleTarget {
	id: string;
	directory: string;
	routes: string[];
	start: (port: number) => string[];
	failureRoute?: string;
	/** Build and start environment on top of {@link exampleEnvironment}. */
	env?: Record<string, string>;
	/** Build command arguments for `bun`. Defaults to `run build`. */
	build?: string[];
}

const preview = (port: number) => ['run', 'start', '--port', String(port)];
const vitePreview = (port: number) => [
	'run',
	'preview',
	'--host',
	'127.0.0.1',
	'--port',
	String(port),
];

export const targets: ExampleTarget[] = [
	{
		directory: 'nextjs',
		failureRoute: '/client-init',
		id: 'nextjs',
		routes: ['/app-router', '/awaited', '/pages-router', '/client-init'],
		start: preview,
	},
	...['react', 'svelte'].map((id) => ({
		directory: id,
		failureRoute: '/',
		id,
		routes: ['/'],
		start: preview,
	})),
	{
		// Stock UI from `@c15t/browser` on `/`, and custom HTML on the
		// headless runtime at `/headless/`.
		directory: 'javascript',
		failureRoute: '/',
		id: 'javascript',
		routes: ['/', '/headless/'],
		start: preview,
	},
	{
		// The `@c15t/browser` script tag on a plain HTML page. The server swaps
		// the page's jsDelivr URL for this checkout's build.
		directory: 'script-tag',
		failureRoute: '/consent-example',
		id: 'html',
		// `/consent-example/headless` swaps in the headless build and the
		// page's own bottom bar from `headless-bar.html`.
		routes: ['/consent-example', '/consent-example/headless'],
		start: () => ['serve.ts'],
	},
	{
		directory: 'vue',
		failureRoute: '/',
		id: 'vue',
		// `/headless` mounts the same plugin with custom consent UI.
		routes: ['/', '/headless'],
		start: preview,
	},
	{
		// Server manifest mode. The prerendered and cached copies of the
		// page share their HTML between visitors; the browser resolves each
		// visitor after hydration.
		directory: 'nuxt',
		failureRoute: '/consent-example',
		id: 'nuxt',
		routes: [
			'/consent-example',
			'/prerendered/consent-example',
			'/cached/consent-example',
		],
		start: () => ['run', 'start'],
	},
	{
		// The same shared-HTML routes in client manifest mode, where the
		// browser resolves the manifest itself.
		directory: 'nuxt',
		env: { C15T_NUXT_MANIFEST: 'client' },
		failureRoute: '/prerendered/consent-example',
		id: 'nuxt-prerender',
		routes: ['/prerendered/consent-example', '/cached/consent-example'],
		start: () => ['run', 'start'],
	},
	{
		// The same app generated as static files with client manifest mode:
		// every page is prerendered, no Nuxt server runs, and the browser
		// fetches the manifest from the backend and resolves the policy.
		build: ['run', 'generate'],
		directory: 'nuxt',
		env: { C15T_NUXT_OUTPUT: 'static' },
		failureRoute: '/consent-example',
		id: 'nuxt-static',
		routes: ['/consent-example'],
		start: (port) => ['run', 'preview:static', '--port', String(port)],
	},
	{
		directory: 'tanstack-start',
		failureRoute: '/consent-example',
		id: 'tanstack-start',
		routes: ['/consent-example'],
		start: () => ['run', 'start'],
	},
	// The same TanStack Start pages under each alternative root route in
	// `examples/tanstack-start/src/rendering`: a streamed consent loader, the
	// same-origin `/api/c15t` server route, and prerendered static files.
	...['streamed', 'same-origin'].map((rendering) => ({
		directory: 'tanstack-start',
		env: { C15T_TANSTACK_RENDERING: rendering },
		failureRoute: '/consent-example',
		id: `tanstack-start-${rendering}`,
		routes: ['/consent-example'],
		start: () => ['run', 'start'],
	})),
	{
		directory: 'tanstack-start',
		env: { C15T_TANSTACK_RENDERING: 'static' },
		failureRoute: '/consent-example',
		id: 'tanstack-start-static',
		routes: ['/consent-example'],
		start: () => ['run', 'start:static'],
	},
	{
		// Server output with manifest mode. The prerendered route leaves the
		// policy to the browser; the cached route renders its banner in a
		// server island.
		directory: 'astro-demo',
		failureRoute: '/consent-example',
		id: 'astro',
		routes: [
			'/consent-example',
			'/consent-example-prerendered',
			'/consent-example-cached',
		],
		start: () => ['dist/server/entry.mjs'],
	},
	{
		// The same demo built as a static site with no adapter: every page
		// is prerendered, and the browser resolves the visitor's policy and
		// applies their stored choice.
		directory: 'astro-demo',
		env: { C15T_ASTRO_OUTPUT: 'static' },
		failureRoute: '/consent-example',
		id: 'astro-static',
		routes: ['/consent-example'],
		start: vitePreview,
	},
	{
		// Server-rendered with loadConsent, a prerendered page under the same
		// layout, manifest-mode route handlers, and a headless banner.
		directory: 'sveltekit-demo',
		failureRoute: '/consent-example',
		id: 'sveltekit',
		routes: [
			'/consent-example',
			'/consent-example/static',
			'/manifest-example',
			'/headless-example',
		],
		start: vitePreview,
	},
];

export const selectedTargets = function selectedTargets(): ExampleTarget[] {
	const selection = process.env.EXAMPLE_TARGET ?? 'nextjs';
	if (selection === 'all') {
		return targets;
	}
	const names = selection.split(',');
	for (const name of names) {
		if (!targets.some((target) => target.id === name)) {
			throw new Error(
				`Unknown EXAMPLE_TARGET ${name}. Choose ${targets.map((target) => target.id).join(', ')} or all.`
			);
		}
	}
	return targets.filter((target) => names.includes(target.id));
};

export const exampleEnvironment = function exampleEnvironment(
	backendURL: string,
	port: number
): NodeJS.ProcessEnv {
	const values: NodeJS.ProcessEnv = {
		...process.env,
		ASTRO_TELEMETRY_DISABLED: '1',
		C15T_BACKEND_URL: backendURL,
		HOST: '127.0.0.1',
		NEXT_TELEMETRY_DISABLED: '1',
		NITRO_HOST: '127.0.0.1',
		NITRO_PORT: String(port),
		NODE_ENV: 'production',
		NUXT_TELEMETRY_DISABLED: '1',
		PORT: String(port),
	};
	for (const prefix of ['NEXT_PUBLIC_', 'VITE_', 'PUBLIC_', 'NUXT_PUBLIC_']) {
		values[`${prefix}C15T_BACKEND_URL`] = backendURL;
		values[`${prefix}POSTHOG_KEY`] = 'phc_example_test';
		values[`${prefix}X_PIXEL_ID`] = 'example-test';
	}
	return values;
};
