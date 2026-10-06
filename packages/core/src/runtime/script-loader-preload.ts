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
 * The judgement reads the runtime's own kernel, so its categories, vendors,
 * overrides, disabled policy and external consent source are the ones
 * `start()` uses. What `start()` adds to that kernel is applied here with
 * the kernel's own code, on a copy of its snapshot:
 *
 * - a streamed prefetch, through the fold `init()` applies it with;
 * - the stored records, through the read persistence reconciles with. A
 *   stored denial counts whatever its age, and a stored grant never does,
 *   so the copy is never more permissive than the kernel after `start()`;
 * - the browser's Global Privacy Control signal, which only restricts.
 *
 * Each script then goes through the loader's own test: `alwaysLoad`, or
 * consent for its category and vendor.
 */
import { detectBrowserGpc, foldInitResponse } from '../kernel/init-lifecycle';
import { buildNextSnapshot } from '../kernel/patch';
import { evaluateConsent } from '../modules/has';
import { readStoredRecordsForReconcile } from '../modules/persistence/hydrate';
import { kernelConfigToInitResponse } from '../transports/init-output';
import type { ConsentKernel } from '../types';
import { storageFor } from './assemble';
import type {
	ConsentRuntimeModules,
	ConsentRuntimeOptions,
	RuntimePrefetch,
} from './types';

/**
 * Whether the script loader, mounted by `start()` now, would run one of
 * `options.scripts` straight away.
 *
 * Errs towards `false`: a stored denial counts even when a newer grant
 * overrides it, a prefetch without a policy grants nothing, and anything
 * that throws reads as no.
 *
 * @param kernel - The runtime's kernel, before `start()`.
 * @param options - The runtime's options.
 * @param streamed - What a streamed prefetch resolved to, once it has.
 * @returns `true` when a script would mount once the loader loads.
 * @internal
 */
// oxlint-disable-next-line complexity -- One pass in the order start() applies them keeps the inputs visible.
export const scriptLoaderRunsAtStart = function scriptLoaderRunsAtStart(
	kernel: ConsentKernel,
	options: ConsentRuntimeOptions,
	streamed?: RuntimePrefetch
): boolean {
	try {
		const now = Date.now();
		let snapshot = kernel.getSnapshot();
		// A disabled runtime grants every category and a `consentSource`
		// decides in place of the records, so `start()` reads none.
		if ((options.enabled ?? true) && !options.consentSource) {
			const response = streamed && kernelConfigToInitResponse(streamed);
			// Without a policy, `init()` asks the backend for one: nothing is
			// granted until then.
			if (response) {
				// The runtime's own overrides win, as `init()` applies them.
				response.resolvedOverrides = {
					...response.resolvedOverrides,
					...options.overrides,
				};
				snapshot = buildNextSnapshot(
					snapshot,
					foldInitResponse(snapshot, response, now).patch
				);
			}
			const { choice, vendorChoice } =
				options.persistence === false
					? {}
					: readStoredRecordsForReconcile(storageFor(options), now).records;
			const categories = { ...snapshot.explicitChoice?.categories };
			for (const [category, decision] of Object.entries(
				choice?.categories ?? {}
			)) {
				if (decision?.value === false) {
					categories[category as keyof typeof categories] = decision;
				}
			}
			const denied = [
				...(snapshot.vendorChoice?.denied ?? []),
				...(vendorChoice?.denied ?? []),
			];
			snapshot = buildNextSnapshot(snapshot, {
				explicitChoice:
					choice || snapshot.explicitChoice
						? { categories, version: 3 }
						: undefined,
				now,
				privacyDetected:
					snapshot.privacySignals.gpc.detected || detectBrowserGpc(),
				vendorChoice: denied.length
					? { confirmedAt: now, denied, version: 1 }
					: undefined,
			});
		}
		// The loader's own test: `alwaysLoad`, or consent for the script's
		// category and vendor.
		return (options.scripts ?? []).some(
			(script) =>
				script.alwaysLoad === true || evaluateConsent(script, snapshot, now)
		);
	} catch {
		return false;
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
): NonNullable<ConsentRuntimeModules['preloadScriptLoader']> {
	return (read, prefetch) => {
		if (typeof document === 'undefined' || !read()?.[1].scripts?.length) {
			return;
		}
		const runs = (streamed?: RuntimePrefetch): boolean => {
			const state = read();
			return Boolean(
				state && scriptLoaderRunsAtStart(state[0], state[1], streamed)
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
