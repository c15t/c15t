/**
 * The `c15t()` Astro integration.
 *
 * It wires these into an Astro app:
 *
 * 1. A `pre`-order middleware that resolves consent for every request into
 *    `Astro.locals.c15t`, and the `App.Locals` type for it.
 * 2. A page-level boot script that creates the one consent runtime the page
 *    shares — Astro islands never share a component tree, so the runtime is
 *    a page singleton rather than a provider.
 * 3. In `manifest()` mode, one catch-all route under `routePrefix` that
 *    answers `init` and `manifest`, with the same semantics as the Next.js
 *    consent route.
 * 4. A virtual module (`virtual:c15t/options`) carrying the serialized
 *    options to all of the above.
 * 5. The component stylesheet, on every page.
 */

import { readBuildEnv } from '@c15t/core/build';
import type { ConsentMode } from '@c15t/core/modes';
import { isIABConfigured } from '@c15t/core/runtime';
import type { AstroIntegration } from 'astro';

import { createClassMapPlugin } from './libs/class-map-plugin';
import type {
	C15tAstroOptions,
	C15tMiddlewareOptions,
	C15tResolvedOptions,
	C15tUIAdapterName,
} from './types';

const VIRTUAL_ID = 'virtual:c15t/options';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

/** Variable the top-level `backendURL` defaults to. */
const BACKEND_URL_ENV = 'PUBLIC_C15T_BACKEND_URL';

/** Where the injected route lives unless `routePrefix` says otherwise. */
const DEFAULT_ROUTE_PREFIX = '/api/c15t';

/** Files tried, in order, when `clientEntrypoint` is unset. */
const CLIENT_ENTRYPOINT_CANDIDATES = [
	'src/c15t.client.ts',
	'src/c15t.client.js',
	'src/c15t.client.mjs',
];

/** Maps an `@c15t/astro/...` specifier to what Astro should load. */
export type EntryResolver = (specifier: string) => string;

/**
 * Create a resolver for this package's own entry points.
 *
 * Astro and Vite resolve what the integration hands them from the site's
 * root. A site that installed the `c15t` package rather than `@c15t/astro`
 * cannot see `@c15t/astro` from there under a strict package manager such
 * as pnpm, so a bare specifier would fail to resolve. A file path always
 * does. `createRequire` resolves the package's own exports on every Node
 * version Astro supports. It is loaded here, from the async setup hook,
 * rather than imported at the top: the package root re-exports the
 * integration, and browser code importing it must not pull in a Node
 * built-in. A specifier that cannot be resolved is kept as it is.
 *
 * @returns The resolver.
 */
export const createOwnEntryResolver =
	async function createOwnEntryResolver(): Promise<EntryResolver> {
		try {
			const { createRequire } = await import('node:module');
			const require = createRequire(import.meta.url);
			return (specifier) => {
				try {
					return require.resolve(specifier);
				} catch {
					return specifier;
				}
			};
		} catch {
			return (specifier) => specifier;
		}
	};

/** The dialog and preference-widget rules, which no first paint needs. */
const DIALOG_STYLESHEET = '@c15t/ui/styles/sheets/dialog.css';
const IAB_DIALOG_STYLESHEET = '@c15t/ui/styles/sheets/iab-dialog.css';

/**
 * What each `ui` adapter needs from the app, keyed by adapter name.
 *
 * `astroIntegration` is checked at `astro:config:done`; `packages` is only
 * ever printed, so the error names everything to install in one go rather
 * than one failed build per missing package.
 */
const UI_ADAPTERS: Record<
	C15tUIAdapterName,
	{
		astroIntegration: string;
		packages: string[];
		adapterModule: string;
		adapterExport: string;
		surfaceModule: string;
		/**
		 * The stylesheets the island's dialog needs beyond the first-paint
		 * rules the page inlines. The client links them when the dialog
		 * opens.
		 */
		dialogStyles: string[];
	}
> = {
	react: {
		adapterExport: 'reactDialogAdapter',
		adapterModule: '@c15t/astro/ui/react',
		astroIntegration: '@astrojs/react',
		dialogStyles: [DIALOG_STYLESHEET],
		packages: ['@astrojs/react', '@c15t/react', 'react', 'react-dom'],
		surfaceModule: '@c15t/astro/islands/panel-surface.tsx',
	},
	svelte: {
		adapterExport: 'svelteDialogAdapter',
		adapterModule: '@c15t/astro/ui/svelte',
		astroIntegration: '@astrojs/svelte',
		// The Svelte components also read the `@c15t/ui/styles/primitives`
		// class maps, whose rules live in their own stylesheet.
		dialogStyles: [DIALOG_STYLESHEET, '@c15t/ui/styles/primitives.css'],
		packages: ['@astrojs/svelte', 'svelte'],
		surfaceModule: '@c15t/astro/islands/panel-surface.svelte',
	},
	vue: {
		adapterExport: 'vueDialogAdapter',
		adapterModule: '@c15t/astro/ui/vue',
		astroIntegration: '@astrojs/vue',
		dialogStyles: [DIALOG_STYLESHEET],
		packages: ['@astrojs/vue', '@c15t/vue', 'vue'],
		surfaceModule: '@c15t/astro/islands/panel-surface.vue',
	},
};

/** Every supported `ui` value, for the error a bad one produces. */
const UI_ADAPTER_NAMES = Object.keys(UI_ADAPTERS) as C15tUIAdapterName[];

/**
 * The `ui` adapter for a site that did not set one: the framework of the
 * one Astro UI integration it registers, so the dialog reuses a runtime
 * the site already loads. With none or several, Svelte, the smallest.
 *
 * @param installed - Names of the integrations the site registers.
 * @returns The adapter name.
 * @internal
 */
export const inferUIAdapter = function inferUIAdapter(
	installed: Iterable<string>
): C15tUIAdapterName {
	const names = new Set(installed);
	const registered = UI_ADAPTER_NAMES.filter((name) =>
		names.has(UI_ADAPTERS[name].astroIntegration)
	);
	return registered.length === 1 && registered[0] ? registered[0] : 'svelte';
};

const resolveMiddleware = function resolveMiddleware(
	options: C15tAstroOptions
): C15tResolvedOptions['middleware'] {
	const raw: C15tMiddlewareOptions =
		typeof options.middleware === 'boolean'
			? { enabled: options.middleware }
			: (options.middleware ?? {});
	const resolved: C15tResolvedOptions['middleware'] = {
		enabled: raw.enabled ?? true,
		skip: raw.skip ?? [],
	};
	if (raw.timeoutMs !== undefined) {
		resolved.timeoutMs = raw.timeoutMs;
	}
	return resolved;
};

/**
 * The injected route's prefix, without a trailing slash.
 *
 * @param routePrefix - The configured `routePrefix`.
 * @returns The prefix, or `undefined` for `routePrefix: false`.
 * @throws {Error} When the prefix is not a root-relative path.
 */
const resolveRoutePrefix = function resolveRoutePrefix(
	routePrefix: C15tAstroOptions['routePrefix']
): string | undefined {
	if (routePrefix === false) {
		return undefined;
	}
	const prefix = routePrefix ?? DEFAULT_ROUTE_PREFIX;
	if (typeof prefix !== 'string' || !prefix.startsWith('/')) {
		throw new Error(
			`@c15t/astro: \`routePrefix\` must be a path that starts with "/", such as '/api/c15t', or false. Got ${JSON.stringify(prefix)}.`
		);
	}
	return prefix.replace(/\/+$/u, '') || undefined;
};

/** Every `type` a mode can carry. */
const MODE_TYPES = new Set(['manifest', 'hosted', 'offline']);

/**
 * Check the mode is plain data from `manifest()`, `hosted()` or
 * `offline()`, and that it has a backend to talk to.
 *
 * `manifest()` reads `${backendURL}/manifest` on the server and the
 * browser saves consent at `${backendURL}/subjects`, so without a backend
 * URL it fails here. A `snapshot` is the network-free path and is left
 * alone: an app on it serves its own save route. `backendURL: ''` saves
 * on this origin but gives the server no manifest, so it also needs a
 * `manifestURL`.
 *
 * @param mode - The configured mode, or `undefined` for the default.
 * @param backendURL - The resolved top-level backend URL.
 * @returns The mode.
 * @throws {Error} When the mode is not mode data, or has nowhere to go.
 */
const resolveMode = function resolveMode(
	mode: C15tAstroOptions['mode'],
	backendURL: string | undefined
): ConsentMode {
	if (mode === undefined) {
		return resolveMode({ type: 'manifest' }, backendURL);
	}
	if (
		typeof mode !== 'object' ||
		mode === null ||
		!MODE_TYPES.has((mode as { type?: unknown }).type as string)
	) {
		throw new Error(
			'@c15t/astro: `mode` must be manifest(), hosted() or offline() from c15t/astro. A transport function cannot be serialized into the page.'
		);
	}
	const envHint = `Set ${BACKEND_URL_ENV} in .env, or pass \`backendURL\` to c15t().`;
	if (mode.type === 'hosted' && (mode.backendURL ?? backendURL) === undefined) {
		throw new Error(
			`@c15t/astro: hosted() needs a backend URL to ask for each visitor's policy. ${envHint}`
		);
	}
	if (mode.type === 'manifest' && !mode.snapshot) {
		if (backendURL === undefined) {
			throw new Error(
				`@c15t/astro: manifest() needs a backend URL: the server reads its policy from \${backendURL}/manifest, and the browser saves consent there with POST /subjects. ${envHint}`
			);
		}
		if (backendURL === '' && !mode.manifestURL) {
			throw new Error(
				"@c15t/astro: `backendURL: ''` saves consent on this origin but gives the server no manifest to fetch. Pass manifest({ manifestURL }) or manifest({ snapshot })."
			);
		}
	}
	return mode;
};

/**
 * Find a function in options that are serialized into the page, where it
 * would silently disappear.
 *
 * @param value - The value to search.
 * @param path - Where `value` sits in the options, for the error.
 * @param seen - Objects already searched, so a cycle ends.
 * @returns The path of the first function, or `undefined`.
 */
const findFunction = function findFunction(
	value: unknown,
	path: string,
	seen: Set<unknown>
): string | undefined {
	if (typeof value === 'function') {
		return path;
	}
	if (typeof value !== 'object' || value === null || seen.has(value)) {
		return undefined;
	}
	seen.add(value);
	const entries = Array.isArray(value)
		? value.map((item, index) => [`${path}[${index}]`, item] as const)
		: Object.entries(value).map(
				([key, item]) => [`${path}.${key}`, item] as const
			);
	for (const [childPath, item] of entries) {
		const found = findFunction(item, childPath, seen);
		if (found) {
			return found;
		}
	}
	return undefined;
};

/**
 * Throw when an option the integration serializes holds a function.
 *
 * `JSON.stringify` drops functions without a word, so a `posthog()` helper
 * in `scripts` would lose its `onBeforeLoad` and an `onRequestBlocked`
 * would never run.
 *
 * @param options - The options passed to `c15t()`.
 * @throws {Error} Naming the first function found and where it belongs.
 */
const assertSerializable = function assertSerializable(
	options: C15tAstroOptions
): void {
	const { mode: _mode, ...serialized } = options;
	const found = findFunction(serialized, 'c15t()', new Set());
	if (found) {
		throw new Error(
			`@c15t/astro: ${found} is a function. c15t() options are serialized into the page as JSON, which drops functions. Move it to src/c15t.client.ts, whose default export (a C15tClientOptionsExtension) can hold scripts with callbacks, \`callbacks\` and \`networkBlocker.onRequestBlocked\`.`
		);
	}
};

/**
 * Normalize user options into the serializable shape every consumer reads.
 *
 * @param options - The options passed to `c15t()`, with `backendURL`
 * already defaulted from the environment.
 * @returns Options with defaults applied.
 * @throws {Error} When an option holds a function, `mode` is not mode data
 * or has no backend to talk to, `ui` or `routePrefix` is invalid, or
 * `experiment` has neither an `arm` nor a site-composed middleware to
 * resolve one.
 */
export const resolveOptions = function resolveOptions(
	options: C15tAstroOptions = {}
): C15tResolvedOptions {
	assertSerializable(options);
	const mode = resolveMode(options.mode, options.backendURL);
	// A JavaScript `astro.config.mjs` has no type checking, so `ui: 'solid'`
	// reaches `buildBootScript()` and throws a bare `TypeError` on an
	// undefined adapter entry. Name the supported values instead.
	if (options.ui !== undefined && !Object.hasOwn(UI_ADAPTERS, options.ui)) {
		throw new Error(
			`@c15t/astro: unknown \`ui\` ${JSON.stringify(options.ui)}. Supported adapters: ${UI_ADAPTER_NAMES.join(', ')}.`
		);
	}
	// The banner is server-rendered HTML that the browser only shows or
	// hides, so the arm has to be known on the server: a static `arm`,
	// or `experimentArm` on a middleware the site composes itself.
	if (
		options.experiment &&
		typeof options.experiment.arm !== 'string' &&
		options.middleware !== false &&
		(typeof options.middleware !== 'object' ||
			options.middleware.enabled !== false)
	) {
		throw new Error(
			'@c15t/astro: `experiment` needs an arm resolved on the server. ' +
				'Set `middleware: false` and export `consentMiddleware({ experimentArm })` ' +
				'from src/middleware.ts to pick one per request, or pass a fixed `experiment.arm`.'
		);
	}
	const {
		middleware: _middleware,
		requireUIIntegration: _requireUIIntegration,
		routePrefix,
		...rest
	} = options;
	const resolved: C15tResolvedOptions = {
		...rest,
		// `null` is the other adapters' spelling of `'none'`. The default is
		// `'system'`, not React's `.dark` mirroring: the banner is server
		// HTML painted before any site script runs, and an Astro site has no
		// shared `.dark` convention to mirror, so following the OS is the
		// only scheme the pre-paint script can get right.
		colorScheme:
			options.colorScheme === null ? 'none' : (options.colorScheme ?? 'system'),
		inlineStyles: options.styles !== false,
		middleware: resolveMiddleware(options),
		mode,
		ui: options.ui ?? 'svelte',
	};
	const prefix = resolveRoutePrefix(routePrefix);
	if (prefix !== undefined) {
		resolved.routePrefix = prefix;
	}
	// A snapshot replaces the manifest fetch, not the endpoint the browser
	// saves consent to. Without the route or a backend, the page would throw
	// on boot instead of here.
	if (
		mode.type === 'manifest' &&
		prefix === undefined &&
		options.backendURL === undefined
	) {
		throw new Error(
			`@c15t/astro: manifest() with \`routePrefix: false\` leaves the browser nowhere to save consent. Set ${BACKEND_URL_ENV} in .env, pass \`backendURL\` to c15t(), or keep the default routePrefix.`
		);
	}
	return resolved;
};

/**
 * The options the browser receives: everything but the snapshot and what
 * only the server and the build read. Every byte here is in each page's
 * boot chunk.
 *
 * @param resolved - The resolved integration options.
 * @returns The browser's copy.
 * @internal
 */
export const toClientOptions = function toClientOptions(
	resolved: C15tResolvedOptions
): Partial<C15tResolvedOptions> {
	const {
		clientEntrypoint: _clientEntrypoint,
		inlineStyles: _inlineStyles,
		middleware: _middleware,
		onBuildError: _onBuildError,
		reportSessions: _reportSessions,
		styles: _styles,
		...client
	} = resolved;
	if (client.mode.type === 'manifest') {
		const { snapshot: _snapshot, source: _source, ...mode } = client.mode;
		client.mode = mode;
	} else {
		// Only `manifest()` calls the injected route.
		delete client.routePrefix;
	}
	return client;
};

/**
 * Where the `clientEntrypoint` module is.
 *
 * A path starting with `.` resolves from the project root; an absolute path
 * or a package specifier is used as it is. Unset, the first of
 * `src/c15t.client.ts`, `.js` and `.mjs` that exists.
 *
 * @param configured - The configured `clientEntrypoint`.
 * @param root - The Astro project root.
 * @returns The specifier the boot script imports, or `undefined`.
 * @throws {Error} When a configured relative path does not exist.
 * @internal
 */
export const resolveClientEntrypoint = async function resolveClientEntrypoint(
	configured: string | undefined,
	root: URL | undefined
): Promise<string | undefined> {
	const { existsSync } = await import('node:fs');
	const { fileURLToPath } = await import('node:url');
	const rootURL = root ?? new URL(`file://${process.cwd()}/`);
	const fromRoot = (path: string): string =>
		fileURLToPath(new URL(path, rootURL));
	if (configured === undefined) {
		return CLIENT_ENTRYPOINT_CANDIDATES.map(fromRoot).find((path) =>
			existsSync(path)
		);
	}
	if (!configured.startsWith('.')) {
		return configured;
	}
	const path = fromRoot(configured);
	if (!existsSync(path)) {
		throw new Error(
			`@c15t/astro: clientEntrypoint ${JSON.stringify(configured)} resolves to ${path}, which does not exist. Relative paths start from the project root.`
		);
	}
	return path;
};

/**
 * Whether the site at `root` builds its CSS with Tailwind CSS 3.
 *
 * @param root - The Astro project root.
 * @returns Resolves `true` when `tailwindcss` resolves from the root at
 * major 3.
 * @internal
 */
export const usesTailwind3 = async function usesTailwind3(
	root: URL | undefined
): Promise<boolean> {
	if (!root) {
		return false;
	}
	try {
		// Dynamic, like `createOwnEntryResolver`: browser code may import the
		// package root, and `node:module` has no browser build.
		const { createRequire } = await import('node:module');
		const require = createRequire(new URL('package.json', root));
		const { version } = require('tailwindcss/package.json') as {
			version?: string;
		};
		return version?.startsWith('3.') === true;
	} catch {
		return false;
	}
};

/** The one field every plugin this integration adds has in common. */
interface VitePluginLike {
	name: string;
}

/** Minimal Vite plugin shape, so the package does not depend on Vite types. */
interface VirtualOptionsPlugin extends VitePluginLike {
	name: string;
	resolveId: (id: string) => string | undefined;
	load: (id: string, options?: { ssr?: boolean }) => string | undefined;
}

const createVirtualOptionsPlugin = function createVirtualOptionsPlugin(
	resolved: C15tResolvedOptions
): VirtualOptionsPlugin {
	const serialized = JSON.stringify(resolved);
	const serializedClient = JSON.stringify(toClientOptions(resolved));
	return {
		load(id, options) {
			if (id !== RESOLVED_VIRTUAL_ID) {
				return undefined;
			}
			// The browser initializes through /init. Only server middleware
			// and routes need the snapshot, policy packs and the translation
			// catalogue.
			return `export default ${options?.ssr ? serialized : serializedClient};`;
		},
		name: 'c15t:options',
		resolveId(id: string) {
			return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : undefined;
		},
	};
};

/** A runtime module factory the boot script imports and registers. */
interface PageRuntimeModule {
	/** The `ConsentRuntimeModules` key it fills. */
	name: 'connectConsentSource' | 'createNetworkBlocker' | 'createScriptLoader';
	/** The export to import, when it differs from `name`. */
	exportName?: string;
	specifier: string;
}

/**
 * The runtime modules this site's pages mount, which the boot script
 * imports and registers.
 *
 * The client mounts none of the script loader, the network blocker and a
 * `consentSource` connection by itself, so a site that configures none of
 * them never downloads them. A site that does gets them statically: loaded
 * on demand, each would arrive only after the boot script ran, and for a
 * returning visitor consented scripts and held requests would wait one
 * more round trip. These options are site-wide and known at build time, so
 * the boot chunk carries the modules, with no extra request and no URL to
 * resolve. A `clientEntrypoint` may add scripts or a `consentSource` the
 * build cannot see, so it keeps both static, and it may add blocker rules,
 * so it gets the on-demand blocker when the site configures none.
 *
 * The boot script imports each on-demand factory on its own: an `import()`
 * of the statically imported script loader anywhere in the page's graph
 * would keep it in a chunk of its own.
 *
 * @param resolved - The resolved options.
 * @returns The factories to import and register.
 */
const pageRuntimeModules = function pageRuntimeModules(
	resolved: C15tResolvedOptions
): PageRuntimeModule[] {
	const modules: PageRuntimeModule[] = [];
	if ((resolved.scripts?.length ?? 0) > 0 || resolved.clientEntrypoint) {
		modules.push({
			name: 'createScriptLoader',
			specifier: '@c15t/core/modules/script-loader',
		});
	}
	if (resolved.networkBlocker) {
		modules.push({
			name: 'createNetworkBlocker',
			specifier: '@c15t/core/modules/network-blocker',
		});
	} else if (resolved.clientEntrypoint) {
		modules.push({
			exportName: 'networkBlockerOnDemand',
			name: 'createNetworkBlocker',
			specifier: '@c15t/core/runtime/on-demand-factories',
		});
	}
	if (resolved.clientEntrypoint) {
		modules.push({
			name: 'connectConsentSource',
			specifier: '@c15t/core/runtime/controls',
		});
	}
	return modules;
};

/**
 * The transport export of `@c15t/astro/client` the page registers, so it
 * ships only the code its mode runs.
 *
 * - `offline()` loads its transport on the first init.
 * - `hosted()` on a site with no adapter: every page is prerendered and
 *   every first visit inits, so the whole hosted transport ships with it.
 * - Otherwise the server resolved the visitor, so only the save path ships
 *   and the init path loads when a page inits again.
 *
 * @param resolved - The resolved options.
 * @param hasAdapter - Whether the site has a server adapter.
 * @returns The export name.
 */
const transportExport = function transportExport(
	resolved: C15tResolvedOptions,
	hasAdapter: boolean
): 'hostedTransport' | 'lazyTransport' | 'offlineTransport' {
	if (resolved.mode.type === 'offline') {
		return 'offlineTransport';
	}
	if (resolved.mode.type === 'hosted' && !hasAdapter) {
		return 'hostedTransport';
	}
	return 'lazyTransport';
};

/**
 * Build the page script the integration injects.
 *
 * The adapter and island specifiers are written here, not in `adapter.ts`
 * or the `.astro` components, because this is the one place that knows
 * `ui` before the app's bundler runs. A static reference to all three
 * would make a Svelte-only site's build resolve `@c15t/react` and `vue`.
 * Both specifiers stay behind `import()`, so nothing loads until someone
 * opens a dialog.
 *
 * @param resolved - The resolved options.
 * @param resolveEntry - Maps this package's specifiers to what Astro loads.
 * @param hasAdapter - Whether the site has a server adapter.
 * @returns The module source to inject at the `page` stage.
 */
const buildBootScript = function buildBootScript(
	resolved: C15tResolvedOptions,
	resolveEntry: EntryResolver,
	hasAdapter = false
): string {
	const { ui } = resolved;
	const adapter = UI_ADAPTERS[ui];
	const serializedUI = JSON.stringify(ui);
	const quote = (specifier: string): string =>
		JSON.stringify(resolveEntry(specifier));
	const transport = transportExport(resolved, hasAdapter);
	const lines = [
		`import options from '${VIRTUAL_ID}';`,
		`import { boot, registerDialogAdapter, registerDialogStyles, registerDialogSurface, registerIAB, registerRuntimeModules, registerTransport, ${transport} } from ${quote('@c15t/astro/client')};`,
		`registerTransport(${transport});`,
		`registerDialogAdapter(${serializedUI}, async () => (await import(${quote(adapter.adapterModule)})).${adapter.adapterExport});`,
		`registerDialogSurface(${serializedUI}, () => import(${quote(adapter.surfaceModule)}));`,
	];
	const runtimeModules = pageRuntimeModules(resolved);
	if (runtimeModules.length > 0) {
		for (const { exportName, name, specifier } of runtimeModules) {
			const binding = exportName ? `${exportName} as ${name}` : name;
			lines.push(`import { ${binding} } from ${quote(specifier)};`);
		}
		lines.push(
			`registerRuntimeModules({ ${runtimeModules.map(({ name }) => name).join(', ')} });`
		);
	}
	// Only a site that sets `iab` ships the CMP mount and the lazy factory,
	// and `@c15t/iab` itself stays behind the factory's `import()`.
	if (isIABConfigured(resolved.iab)) {
		lines.push(
			`import { createLazyIABFactory } from ${quote('@c15t/core/runtime')};`,
			`import { mountRuntimeIAB } from ${quote('@c15t/core/runtime/on-demand')};`,
			`registerIAB({ ...createLazyIABFactory(() => import(${quote('@c15t/iab')})), mount: mountRuntimeIAB });`
		);
	}
	// `?url` makes each stylesheet an emitted file and the import a string,
	// so none of its rules reach the page until the client links it. Pages
	// that link `styles.css` already have the dialog's rules.
	const dialogStyles = resolved.inlineStyles
		? adapter.dialogStyles
		: adapter.dialogStyles.filter(
				(specifier) => specifier !== DIALOG_STYLESHEET
			);
	if (resolved.styles !== false && dialogStyles.length > 0) {
		const names = dialogStyles.map((_, index) => `dialogStyle${index}`);
		dialogStyles.forEach((specifier, index) => {
			lines.push(
				`import ${names[index]} from ${JSON.stringify(`${resolveEntry(specifier)}?url`)};`
			);
		});
		lines.push(`registerDialogStyles([${names.join(', ')}]);`);
	}
	if (resolved.inlineStyles && isIABConfigured(resolved.iab)) {
		lines.push(
			`import iabDialogStyle from ${JSON.stringify(`${resolveEntry(IAB_DIALOG_STYLESHEET)}?url`)};`,
			"registerDialogStyles([iabDialogStyle], 'iab');"
		);
	}
	if (resolved.clientEntrypoint) {
		lines.push(
			`import clientOptions from ${JSON.stringify(resolved.clientEntrypoint)};`,
			'boot(options, clientOptions);'
		);
	} else {
		lines.push('boot(options);');
	}
	return lines.join('\n');
};

/**
 * Build the stylesheet imports for a Tailwind 3 site, where the host must
 * process the base and optional IAB rules instead of inlining them.
 *
 * @param resolved - The resolved integration options.
 * @param resolveEntry - Maps this package's specifiers to what Astro loads.
 * @returns The module source, or an empty string when there is nothing to
 * add or with `styles: false`.
 */
export const buildStylesImport = function buildStylesImport(
	resolved: C15tResolvedOptions,
	resolveEntry: EntryResolver
): string {
	const quote = (specifier: string): string =>
		JSON.stringify(resolveEntry(specifier));
	if (resolved.styles === false) {
		return '';
	}
	// The banner's rules are inlined into the HTML with its config (see
	// `<ConsentScript />`), so no stylesheet link holds back the first
	// paint. The dialog's rules are not here either: the boot script
	// registers them and the client links them on the first open. A
	// Tailwind 3 build has to process the rules itself, so it gets the
	// whole stylesheet, linked as before.
	const lines: string[] = [];
	if (!resolved.inlineStyles) {
		lines.push(`import ${quote('@c15t/astro/styles.css')};`);
	}
	if (!resolved.inlineStyles && isIABConfigured(resolved.iab)) {
		lines.push(`import ${quote('@c15t/astro/iab/styles.css')};`);
	}
	return lines.join('\n');
};

/**
 * The Vite plugins the app needs for the configured `ui`.
 *
 * `@c15t/vue` resolves its own runtime specifiers (`#imports`,
 * `#c15t/composables`) through its package `imports`, but ships `.vue`
 * files, which Vite's dependency pre-bundling cannot load, so the `vue`
 * adapter keeps it out of pre-bundling.
 *
 * With the full stylesheet injected, the islands' own component CSS would
 * be a second copy, so their class maps resolve without it.
 *
 * @param resolved - The resolved integration options.
 * @returns Vite plugins to merge into the app config.
 */
export const buildVitePlugins = function buildVitePlugins(
	resolved: C15tResolvedOptions
): VitePluginLike[] {
	const plugins: VitePluginLike[] = [createVirtualOptionsPlugin(resolved)];
	if (resolved.styles !== false) {
		plugins.push(
			createClassMapPlugin({
				iabStylesInjected: isIABConfigured(resolved.iab),
			})
		);
	}
	if (resolved.ui === 'vue') {
		plugins.push({
			config: () => ({
				optimizeDeps: { exclude: ['@c15t/vue', 'c15t'] },
			}),
			name: '@c15t/vue',
		} as VitePluginLike);
	}
	return plugins;
};

/**
 * Whether `astro build` needs a server adapter for the injected route:
 * it renders on demand unless it is prerendered for browser resolution on
 * a site without one.
 */
const routeIsPrerendered = function routeIsPrerendered(
	resolved: C15tResolvedOptions,
	hasAdapter: boolean
): boolean {
	return (
		!hasAdapter &&
		resolved.mode.type === 'manifest' &&
		resolved.mode.resolve === 'browser'
	);
};

/**
 * Whether the integration injects its route: in `manifest()` mode, unless
 * `routePrefix: false`. Hosted and offline pages never call it.
 */
const injectsRoute = function injectsRoute(
	resolved: C15tResolvedOptions
): resolved is C15tResolvedOptions & { routePrefix: string } {
	return (
		resolved.routePrefix !== undefined && resolved.mode.type === 'manifest'
	);
};

/**
 * Explain why a build with the injected route needs an adapter.
 *
 * @param routePrefix - The injected route's prefix.
 * @returns The error message.
 */
const missingAdapterMessage = function missingAdapterMessage(
	routePrefix: string
): string {
	return `@c15t/astro: manifest() resolves each visitor on the server and injects an on-demand route at ${routePrefix}/[...path], which needs a server adapter to build. For a static site, use hosted(), offline() or manifest({ resolve: 'browser' }), or set \`routePrefix: false\`.`;
};

/**
 * Fetch the manifest for `astro build` or `astro dev` and put it in the
 * resolved mode as its `snapshot`. `hosted()` and `offline()` have no
 * manifest to fetch, a `snapshot` is already one, and
 * `manifest({ source: 'runtime' })` always fetches at runtime.
 *
 * @param resolved - The resolved options; its mode gains the snapshot.
 * @param command - `build` or `dev`.
 * @param logger - Astro's integration logger.
 * @throws {Error} When the fetch fails in `'fail'` mode.
 */
const bundleBuildManifest = async function bundleBuildManifest(
	resolved: C15tResolvedOptions,
	command: 'build' | 'dev',
	logger: { info: (message: string) => void; warn: (message: string) => void }
): Promise<void> {
	const { mode } = resolved;
	if (mode.type !== 'manifest' || mode.snapshot || mode.source === 'runtime') {
		return;
	}
	const { loadManifestForBuild } = await import('@c15t/core/build');
	const snapshot = await loadManifestForBuild(
		{ backendURL: resolved.backendURL, manifestURL: mode.manifestURL },
		{
			command,
			envNames: [BACKEND_URL_ENV],
			label: '@c15t/astro',
			logger,
			onBuildError: resolved.onBuildError,
		}
	);
	if (snapshot) {
		// A snapshot is its own source.
		const { source: _source, ...rest } = mode;
		resolved.mode = { ...rest, snapshot };
	}
};

/**
 * The `App.Locals` declaration the integration adds to `.astro/types.d.ts`,
 * so a site types `Astro.locals.c15t` without an `env.d.ts` line.
 *
 * It names the package the site itself depends on: under a strict package
 * manager, a site that installed `c15t` cannot see `@c15t/astro`.
 *
 * @param root - The Astro project root.
 * @returns The declaration file's content.
 * @internal
 */
export const buildLocalsTypes = async function buildLocalsTypes(
	root: URL | undefined
): Promise<string> {
	let source = '@c15t/astro';
	try {
		const { createRequire } = await import('node:module');
		const require = createRequire(
			new URL('package.json', root ?? `file://${process.cwd()}/`)
		);
		require.resolve('c15t/astro');
		source = 'c15t/astro';
	} catch {
		// `@c15t/astro` is installed directly.
	}
	return [
		'declare namespace App {',
		'	interface Locals {',
		'		/** Consent context resolved by the c15t middleware. */',
		`		c15t: import('${source}').C15tLocals;`,
		'	}',
		'}',
		'',
	].join('\n');
};

/**
 * Resolve the options for this site: the backend URL from the environment
 * or `.env` in the project root, the `ui` from the registered integrations,
 * and where the client entrypoint is.
 *
 * @param options - The options passed to `c15t()`.
 * @param config - Astro's config, as `astro:config:setup` has it.
 * @param command - The Astro command.
 * @returns The resolved options.
 * @throws {Error} When {@link resolveOptions} or
 * {@link resolveClientEntrypoint} does.
 */
const resolveSiteOptions = async function resolveSiteOptions(
	options: C15tAstroOptions,
	config: { root?: URL; integrations?: { name: string }[] } | undefined,
	command: string
): Promise<C15tResolvedOptions> {
	const { fileURLToPath } = await import('node:url');
	const root = config?.root;
	const backendURL =
		options.backendURL ??
		readBuildEnv([BACKEND_URL_ENV], {
			mode: command === 'build' ? 'production' : 'development',
			root: root ? fileURLToPath(root) : process.cwd(),
		});
	const site = resolveOptions(
		backendURL === undefined ? options : { ...options, backendURL }
	);
	if (options.ui === undefined) {
		site.ui = inferUIAdapter(
			(config?.integrations ?? []).map((integration) => integration.name)
		);
	}
	const clientEntrypoint = await resolveClientEntrypoint(
		options.clientEntrypoint,
		root
	);
	if (clientEntrypoint === undefined) {
		delete site.clientEntrypoint;
	} else {
		site.clientEntrypoint = clientEntrypoint;
	}
	return site;
};

/**
 * Create the c15t Astro integration.
 *
 * @param options - Consent configuration for the site. Everything here is
 * serialized into the page; callbacks belong in `src/c15t.client.ts`.
 * @returns The Astro integration to list in `astro.config.mjs`.
 * @throws {Error} When an option holds a function, the mode has no backend
 * URL, the Astro integration for the dialog's `ui` is not listed in
 * `astro.config`, or `astro build` runs with the injected on-demand route
 * and no server adapter.
 * @example
 * ```js
 * import node from '@astrojs/node';
 * import svelte from '@astrojs/svelte';
 * import { defineConfig } from 'astro/config';
 * import c15t from 'c15t/astro';
 *
 * // Reads PUBLIC_C15T_BACKEND_URL from .env.
 * export default defineConfig({
 *   adapter: node({ mode: 'standalone' }),
 *   integrations: [svelte(), c15t()],
 *   output: 'server',
 * });
 * ```
 */
export const c15t = function c15t(
	options: C15tAstroOptions = {}
): AstroIntegration {
	// Checked here as well, so a bad option fails before Astro starts.
	assertSerializable(options);
	let resolved: C15tResolvedOptions | undefined;
	// Recorded at `astro:config:setup`, which runs before `astro:config:done`.
	let command: string | undefined;

	return {
		hooks: {
			async 'astro:config:done'({ config, injectTypes, logger }) {
				if (!resolved) {
					return;
				}
				injectTypes({
					content: await buildLocalsTypes(config.root),
					filename: 'locals.d.ts',
				});
				// Astro would stop the build on its own, with a generic
				// "no adapter" error that never mentions the route c15t added.
				// Only the build needs an adapter: `astro dev` and `astro sync`
				// accept on-demand routes without one.
				if (
					command === 'build' &&
					injectsRoute(resolved) &&
					!config.adapter &&
					!routeIsPrerendered(resolved, false)
				) {
					throw new Error(missingAdapterMessage(resolved.routePrefix));
				}

				if (options.requireUIIntegration === false) {
					return;
				}
				const installed = new Set(
					config.integrations.map((integration) => integration.name)
				);
				const adapter = UI_ADAPTERS[resolved.ui];
				if (installed.has(adapter.astroIntegration)) {
					return;
				}
				logger.error(
					`the preference-centre and IAB dialogs render as ${resolved.ui} islands, so ${adapter.astroIntegration} must be installed and listed in astro.config before c15t(). Install ${adapter.packages.join(', ')} and run \`npx astro add ${resolved.ui}\`, or pass \`requireUIIntegration: false\` if you only use the server-rendered banner.`
				);
				throw new Error(
					`@c15t/astro: ui: ${JSON.stringify(resolved.ui)} needs ${adapter.astroIntegration}. Install it, or set \`requireUIIntegration: false\` for a banner-only site.`
				);
			},

			async 'astro:config:setup'({
				addMiddleware,
				command: setupCommand,
				config,
				injectRoute,
				injectScript,
				logger,
				updateConfig,
			}) {
				command = setupCommand;
				const root = config?.root;
				const site = await resolveSiteOptions(options, config, command);
				resolved = site;
				if (command === 'build' || command === 'dev') {
					await bundleBuildManifest(site, command, logger);
				}
				const resolveEntry = await createOwnEntryResolver();
				// Tailwind 3 unwraps c15t's cascade layer in the stylesheets it
				// builds (`c15t/postcss-tailwind3`). Inlined rules skip that
				// build and would lose to its preflight.
				if (site.inlineStyles && (await usesTailwind3(root))) {
					site.inlineStyles = false;
				}

				// With Astro's own CSP on, allow the inline code the components
				// render, and hand the browser the policy's script hashes so it
				// can name the `clientEntrypoint` scripts the policy lacks.
				// Loaded here so the package root, which browser code may
				// import, does not pull in the server renderers.
				const { buildAstroCsp } = await import('./csp');
				const csp = await buildAstroCsp(config, site);
				const serialized = csp?.browser ? { ...site, csp: csp.browser } : site;
				updateConfig({
					vite: { plugins: buildVitePlugins(serialized) },
				});
				if (csp) {
					updateConfig(csp.update);
				}

				if (site.middleware.enabled) {
					addMiddleware({
						entrypoint: resolveEntry('@c15t/astro/middleware'),
						order: 'pre',
					});
				}

				// `page` runs the boot on every page, before any island
				// hydrates, so the runtime exists before anything asks for it.
				injectScript(
					'page',
					buildBootScript(site, resolveEntry, Boolean(config?.adapter))
				);

				// `page-ssr` is Astro's hook for page-wide CSS. The components
				// cannot import their own: the server build resolves the class
				// maps through the `node` condition, which carries no CSS.
				const styles = buildStylesImport(site, resolveEntry);
				if (styles) {
					injectScript('page-ssr', styles);
				}

				if (injectsRoute(site)) {
					injectRoute({
						entrypoint: resolveEntry('@c15t/astro/api'),
						pattern: `${site.routePrefix}/[...path]`,
						prerender: routeIsPrerendered(site, Boolean(config?.adapter)),
					});
				}
			},
		},
		name: '@c15t/astro',
	};
};

export default c15t;
