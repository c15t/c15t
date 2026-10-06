/**
 * Start a provider runtime's script loader download before the runtime
 * starts, when the visitor's consent already lets a script run.
 *
 * A framework provider builds its runtime during its first render and
 * starts it from a mount effect, once the whole tree has rendered. A
 * script loader that loads on demand requests its chunk only then. When
 * consent already lets a script run, the provider can start that request
 * from its first render instead, so the chunk loads while the rest of the
 * page renders.
 *
 * Opt-in: a host hands {@link preloadScriptLoaderWith} to the runtime as
 * its `preloadScriptLoader` module. The Next.js and TanStack Start roots
 * do, since their state usually holds a returning visitor's choice. A
 * runtime without it ships none of this module.
 *
 * The judgement reads the runtime's own kernel when `start()` reads no
 * records: a disabled runtime grants every category, a `consentSource`
 * decides in their place, and a prefetch without a policy grants nothing
 * until `init()` asks the backend for one. Otherwise it judges the kernel
 * `start()` would leave the loader with: built by the runtime's own kernel
 * factory from the runtime's options and the prefetch, streamed or not,
 * then hydrated by the runtime's own persistence module and given the
 * browser's Global Privacy Control signal. So its categories, vendors,
 * overrides, stored records, including a newer denial a dropped cookie
 * write left only in localStorage, and GPC are the ones `start()` applies.
 *
 * Each script then goes through the loader's own test: `alwaysLoad`, or
 * consent for its category and vendor.
 *
 * The runtime hands in its kernel factory and persistence module, rather
 * than this module importing them or the kernel's internals. A bundler
 * that merges a module group into one scope (Turbopack does) splits that
 * group apart once another module imports one of its members, and every
 * page that uses the group pays for it.
 */
import { evaluateConsent } from '../modules/has';
import type { ConsentKernel } from '../types';
import type {
	ConsentRuntimeModules,
	ConsentRuntimeOptions,
	RuntimePrefetch,
} from './types';

type PreloadScriptLoader = NonNullable<
	ConsentRuntimeModules['preloadScriptLoader']
>;

/**
 * Whether the script loader, mounted by `start()` now, would run one of
 * `options.scripts` straight away. Anything that throws reads as no.
 *
 * @param kernel - The runtime's kernel, before `start()`.
 * @param options - The runtime's options.
 * @param createKernel - The runtime's kernel factory.
 * @param createPersistence - The runtime's persistence module.
 * @param streamed - What a streamed prefetch resolved to, once it has.
 * @returns `true` when a script would mount once the loader loads.
 * @internal
 */
export const scriptLoaderRunsAtStart = function scriptLoaderRunsAtStart(
	kernel: ConsentKernel,
	options: ConsentRuntimeOptions,
	createKernel: Parameters<PreloadScriptLoader>[2],
	createPersistence: Parameters<PreloadScriptLoader>[3],
	streamed?: RuntimePrefetch
): boolean {
	let judged = kernel;
	try {
		const prefetch = streamed ?? options.prefetch;
		if (
			(options.enabled ?? true) &&
			!options.consentSource &&
			prefetch?.initialPolicyResolution
		) {
			judged = createKernel({
				...options,
				// Never asked for anything: the kernel is only read.
				mode: (() => ({})) as unknown as ConsentRuntimeOptions['mode'],
				prefetch,
			});
			const { persistence } = options;
			if (persistence !== false) {
				const settings = typeof persistence === 'object' ? persistence : {};
				const seed = prefetch.initialRecords;
				// As `start()` mounts it: records a server read from the cookie
				// stay, and only newer stored denials apply over them.
				createPersistence({
					kernel: judged,
					now: settings.now,
					skipHydration:
						settings.skipHydration ??
						Object.keys(seed ?? {}).some((key) => key !== 'subject'),
					storageConfig: settings.storageConfig ?? options.storageConfig,
					sync: false,
				}).dispose();
			}
			let gpc: unknown;
			try {
				gpc = (navigator as { globalPrivacyControl?: unknown })
					.globalPrivacyControl;
			} catch {
				// A getter that throws reads as no signal, as the kernel's own
				// read does.
			}
			if (gpc === true) {
				judged.set.privacySignals({ gpc: true });
			}
		}
		const snapshot = judged.getSnapshot();
		const now = Date.now();
		// The loader's own test: `alwaysLoad`, or consent for the script's
		// category and vendor.
		return (options.scripts ?? []).some(
			(script) =>
				script.alwaysLoad === true || evaluateConsent(script, snapshot, now)
		);
	} catch {
		return false;
	} finally {
		// Whatever happened, the kernel built here is only ever read.
		if (judged !== kernel) {
			judged.dispose();
		}
	}
};

/**
 * The `preloadScriptLoader` module for a provider runtime: it starts
 * `load` during construction when consent already lets a script run, or
 * once a streamed prefetch arrives and shows it does. It does nothing
 * outside the browser, or once the runtime has started or been disposed.
 *
 * @param load - The load the runtime's `createScriptLoader` factory makes,
 * so both share one `import()` and one chunk request.
 * @returns The module to pass in the runtime's modules.
 * @internal
 *
 * @example
 * ```ts
 * const loadScriptLoader = async () =>
 *   (await import('@c15t/core/modules/script-loader')).createScriptLoader;
 * createConsentProviderRuntime(options, {
 *   ...modules,
 *   createScriptLoader: lazyRuntimeModule(loadScriptLoader),
 *   preloadScriptLoader: preloadScriptLoaderWith(loadScriptLoader),
 * });
 * ```
 */
export const preloadScriptLoaderWith = function preloadScriptLoaderWith(
	load: () => Promise<unknown>
): PreloadScriptLoader {
	return (read, prefetch, createKernel, createPersistence) => {
		if (typeof document === 'undefined' || !read()?.[1].scripts?.length) {
			return;
		}
		const runs = (streamed?: RuntimePrefetch): boolean => {
			const state = read();
			return Boolean(
				state &&
				scriptLoaderRunsAtStart(
					state[0],
					state[1],
					createKernel,
					createPersistence,
					streamed
				)
			);
		};
		// Synchronous up to the first `await`: a known prefetch decides, and
		// the import starts, during construction.
		void (async () => {
			try {
				if (
					runs() ||
					(typeof (prefetch as PromiseLike<unknown> | undefined)?.then ===
						'function' &&
						runs(await (prefetch as PromiseLike<RuntimePrefetch>)))
				) {
					await load();
				}
			} catch {
				// A failed stream is the first `init()`'s to report, a failed
				// load the loader's own.
			}
		})();
	};
};
