export interface ExampleTarget {
	id: string;
	directory: string;
	routes: string[];
	start: (port: number) => string[];
	failureRoute?: string;
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
		routes: ['/app-router', '/pages-router'],
		start: preview,
	},
	...['react', 'vue', 'svelte', 'javascript'].map((id) => ({
		directory: id,
		failureRoute: '/',
		id,
		routes: ['/'],
		start: preview,
	})),
	{
		directory: 'nuxt',
		failureRoute: '/consent-example',
		id: 'nuxt',
		routes: ['/consent-example'],
		start: () => ['run', 'start'],
	},
	{
		directory: 'tanstack-start',
		failureRoute: '/consent-example',
		id: 'tanstack-start',
		routes: ['/consent-example'],
		start: () => ['run', 'start'],
	},
	{
		directory: 'astro-demo',
		failureRoute: '/consent-example',
		id: 'astro',
		routes: ['/consent-example'],
		start: () => ['dist/server/entry.mjs'],
	},
	{
		directory: 'sveltekit-demo',
		failureRoute: '/consent-example',
		id: 'sveltekit',
		routes: ['/consent-example'],
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
