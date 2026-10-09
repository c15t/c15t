/**
 * How to build, start and size each example. Every example runs its own
 * `build` and `start` scripts from the measured checkout; this table only
 * adds the port, the flags those scripts accept, and where the client build
 * lands.
 */
import { examplesPayloadExamples } from '@c15t/benchmarking/examples-payload';
import type { ExamplesPayloadExample } from '@c15t/benchmarking/examples-payload';

export interface ExampleRuntime extends ExamplesPayloadExample {
	/** Port the started example listens on. */
	port: number;
	/** Extra arguments for its `start` script. */
	startArgs: string[];
	/** Extra environment for its `start` script. */
	startEnv: Record<string, string>;
	/** Client build directories, relative to the example, for emitted JS. */
	clientDirs: string[];
}

const vitePreview = (port: number) => ({
	port,
	startArgs: ['--port', String(port), '--strictPort'],
	startEnv: {},
});
const portEnv = (port: number) => ({
	port,
	startArgs: [],
	startEnv: { HOST: '127.0.0.1', PORT: String(port) },
});

const RUNTIMES: Record<
	string,
	Omit<ExampleRuntime, keyof ExamplesPayloadExample>
> = {
	astro: { ...portEnv(4521), clientDirs: ['dist/client'] },
	'astro-static': {
		clientDirs: ['dist'],
		port: 4522,
		startArgs: ['--port', '4522', '--host', '127.0.0.1'],
		startEnv: {},
	},
	// The page loads c15t.js from the backend, so there is no client build.
	html: { ...portEnv(4523), clientDirs: [] },
	javascript: { ...vitePreview(4524), clientDirs: ['dist'] },
	// `next start --port 3100` is fixed in the example's script.
	nextjs: {
		clientDirs: ['.next/static'],
		port: 3100,
		startArgs: [],
		startEnv: {},
	},
	'nextjs-pages-router': {
		clientDirs: ['.next/static'],
		port: 3101,
		startArgs: [],
		startEnv: {},
	},
	nuxt: { ...portEnv(4525), clientDirs: ['.output/public'] },
	'nuxt-static': { ...vitePreview(4526), clientDirs: ['.output/public'] },
	react: { ...vitePreview(4527), clientDirs: ['dist'] },
	svelte: { ...vitePreview(4528), clientDirs: ['dist'] },
	sveltekit: {
		...vitePreview(4529),
		clientDirs: ['.svelte-kit/output/client'],
		startArgs: ['--port', '4529', '--strictPort', '--host', '127.0.0.1'],
	},
	'tanstack-start': { ...portEnv(4530), clientDirs: ['dist/client'] },
	vue: { ...vitePreview(4531), clientDirs: ['dist'] },
};

export const exampleRuntimes: ExampleRuntime[] = examplesPayloadExamples.map(
	(example) => {
		const runtime = RUNTIMES[example.name];
		if (!runtime) {
			throw new Error(`No runtime settings for example ${example.name}`);
		}
		return { ...example, ...runtime };
	}
);

/** Hosts the examples hard-code; the runner routes them to the fixture. */
export const isFixtureHost = function isFixtureHost(hostname: string): boolean {
	return hostname === 'inth.app' || hostname.endsWith('.inth.app');
};

/**
 * The four public backend variables, so every framework's build and
 * server read the fixture backend. Real environment variables win over
 * the examples' committed `.env` files and over config fallbacks.
 */
export const backendEnv = function backendEnv(
	backendURL: string
): Record<string, string> {
	return {
		NEXT_PUBLIC_C15T_BACKEND_URL: backendURL,
		NUXT_PUBLIC_C15T_BACKEND_URL: backendURL,
		PUBLIC_C15T_BACKEND_URL: backendURL,
		VITE_C15T_BACKEND_URL: backendURL,
	};
};
