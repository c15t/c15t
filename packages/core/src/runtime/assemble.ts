/**
 * The consent runtime: a kernel plus every opt-in module, wired, with a
 * lifecycle hosts drive and do not re-derive.
 *
 * - `start()` mounts the modules, then runs `init()` or adopts a resolved
 *   prefetch; `dispose()` undoes it in reverse, the kernel last.
 * - `clearRecords()` is the one clear sequence.
 * - `setLanguage()` switches copy and asks the backend again.
 *
 * The modules come in through {@link ConsentRuntimeModules}. Options are
 * read when they are used, not copied at construction, so the provider
 * runtime (`provider-runtime.ts`) can hand in a live view of a component's
 * props and stop and start the runtime around the same kernel. A host that
 * configures once never loads that code.
 */
import type { AllConsentNames } from '../consent/consent-types';
import { clearKernelRecords } from '../kernel/clear-records';
import { hostExperiment, startExperiment } from '../libs/experiment';
import { extractConsentNamesFromCondition } from '../libs/has';
import type { IframeBlockerHandle } from '../modules/iframe-blocker/types';
import { holdNetworkRequests, NOT_HELD } from '../modules/network-blocker/hold';
import type { NetworkHold } from '../modules/network-blocker/hold';
import type { PersistenceHandle } from '../modules/persistence/types';
import type { ScriptLoaderHandle } from '../modules/script-loader/types';
import { resolveWindowDebugMode } from '../modules/window-debug';
import type { HydrationRecords } from '../types';
import { wireRuntimeCallbacks } from './callbacks';
import { afterModuleLoaded } from './lazy-module';
import {
	createRuntimeKernel,
	hasResolvedPrefetch,
	normalizeKernelUser,
} from './runtime-kernel';
import type {
	ConsentRuntime,
	ConsentRuntimeIABHandle,
	ConsentRuntimeModules,
	ConsentRuntimeOptions,
} from './types';

/** What the provider runtime needs beyond the public interface. @internal */
export interface AssembledRuntime {
	/**
	 * Send the requests held for a runtime parked before it ran: a disabled
	 * provider grants every category, so nothing waits for its blocker.
	 * `start()` holds again until its blocker takes over.
	 */
	releaseHold: () => void;
	runtime: ConsentRuntime;
	/**
	 * Unmount every module and `window.c15t` and detach callbacks, keeping
	 * the kernel and its records. `start()` mounts them again, then adopts
	 * the prefetch at the current clock or runs `init()`.
	 */
	stop: () => void;
}

/**
 * Whether a prefetch's records seed the kernel in place of storage.
 *
 * Records a server read from the request cookie are the seed: persistence
 * then applies only newer stored denials over them. A prefetch that names
 * nothing but a subject (an `/init` answer's `subjectId`) read no records,
 * so storage hydrates the kernel as it would without a prefetch.
 */
const isRecordSeed = function isRecordSeed(
	records: HydrationRecords | undefined
): boolean {
	return Boolean(
		records && Object.keys(records).some((key) => key !== 'subject')
	);
};

/** The storage `persistence` resolves to, from one option set. @internal */
export const storageFor = function storageFor(
	options: Pick<
		ConsentRuntimeOptions,
		'consentSource' | 'persistence' | 'storageConfig'
	>
): ConsentRuntimeOptions['storageConfig'] {
	return (
		(!options.consentSource && typeof options.persistence === 'object'
			? options.persistence.storageConfig
			: undefined) ?? options.storageConfig
	);
};

/**
 * Build a runtime from options and module factories.
 *
 * @param options - The runtime configuration, read when used.
 * @param modules - The module factories to mount.
 * @returns The runtime and its `stop()`.
 * @throws {Error} When `mode` is not a transport factory.
 * @internal
 */
// oxlint-disable-next-line max-lines-per-function -- One cohesive lifecycle: construct, start, stop, dispose.
export const assembleConsentRuntime = function assembleConsentRuntime(
	options: ConsentRuntimeOptions,
	modules: ConsentRuntimeModules
): AssembledRuntime {
	const { consentSource } = options;
	const enabled = options.enabled ?? true;
	const experiment = hostExperiment(options.experiment, options.prefetch);
	const kernel = createRuntimeKernel(options);
	// `start()` installs the blocker, often after the host rendered its
	// children. Hold matching requests until then; the blocker takes over this
	// runtime's hold and replays them. A runtime disposed before it started
	// ends its hold itself, failing what it held closed. Either way, other
	// callers' holds stay in place.
	const holdRequests = (): NetworkHold | null =>
		enabled &&
		options.networkBlocker &&
		options.networkBlocker.enabled !== false
			? holdNetworkRequests(options.networkBlocker.rules)
			: null;
	let hold = holdRequests();

	let iabHandle: ConsentRuntimeIABHandle | null = null;
	let iframeBlocker: IframeBlockerHandle | null = null;
	let persistenceHandle: PersistenceHandle | null = null;
	let started = false;
	let disposed = false;
	let adopted = false;

	const iabListeners = new Set<
		(handle: ConsentRuntimeIABHandle | null) => void
	>();
	const emitIAB = function emitIAB(handle: ConsentRuntimeIABHandle | null) {
		iabHandle = handle;
		for (const listener of iabListeners) {
			listener(handle);
		}
	};

	// Attached at construction, so they hear events from the first `start()`.
	const wire = (): (() => void)[] => [
		wireRuntimeCallbacks({
			callbacks: options.callbacks,
			kernel,
		}),
		modules.watchRevocationReload({
			getOnBeforeReload: () =>
				options.callbacks?.onBeforeConsentRevocationReload,
			isEnabled: () => options.reloadOnConsentRevoked !== false,
			kernel,
		}),
		// Vendors the backend declares arrive with init. Their categories
		// become selectable the same way a code-declared vendor's do at
		// construction.
		kernel.events.on('init:applied', ({ snapshot }) => {
			const declared = snapshot.vendors?.declared ?? [];
			if (declared.length > 0) {
				kernel.set.registerConsentCategories(
					declared.flatMap((vendor) =>
						extractConsentNamesFromCondition(vendor.category)
					)
				);
			}
		}),
	];
	// Teardown runs in reverse push order, so the wiring, pushed first, is
	// detached after every module that reads from the kernel.
	let disposers: (() => void)[] = wire();

	const runInit = async function runInit(): Promise<void> {
		if (disposed || consentSource || !enabled) {
			return;
		}
		await kernel.commands.init();
	};

	const stop = function stop(): void {
		started = false;
		for (const dispose of disposers.reverse()) {
			dispose();
		}
		disposers = [];
	};

	const runtime: ConsentRuntime = {
		clearRecords() {
			if (persistenceHandle) {
				persistenceHandle.clear();
				return;
			}
			clearKernelRecords(kernel);
		},
		get consentCategories(): AllConsentNames[] {
			const snapshot = kernel.getSnapshot();
			return [
				'necessary',
				...(snapshot.evaluationPolicy.choiceScope ?? snapshot.policyRule.scope),
			];
		},
		dispose() {
			disposed = true;
			stop();
			kernel.dispose();
			// No blocker took the hold over, so nothing else ends it, and
			// nothing checked consent for what it held: those requests fail
			// as blocked rather than wait for the rest of the page.
			hold?.block();
			hold = null;
			iabListeners.clear();
		},
		experiment,
		get iab() {
			return iabHandle;
		},
		async identify(user) {
			const nextUser = normalizeKernelUser(user);
			if (!nextUser) {
				return;
			}
			try {
				await kernel.commands.identify(nextUser);
			} catch {
				// Surfaced through the `command:error` event and `onError`.
			}
		},
		kernel,
		onIABChange(listener) {
			iabListeners.add(listener);
			return function unsubscribeIAB() {
				iabListeners.delete(listener);
			};
		},
		processIframes() {
			iframeBlocker?.processAllIframes();
		},
		reconcileStorage() {
			return persistenceHandle?.reconcile() ?? false;
		},
		reinit: runInit,
		resetVendorDraft() {
			kernel.set.vendorDraft(null);
		},
		setConsentCategories(categories) {
			kernel.set.consentCategories(categories);
		},
		setLanguage(language) {
			if (language !== kernel.getSnapshot().overrides.language) {
				kernel.set.language(language);
				void runInit();
			}
		},
		setOverrides(overrides) {
			kernel.set.overrides(overrides);
		},
		stageVendorConsent(vendorId, granted) {
			kernel.set.vendorDraft({ [vendorId]: granted });
		},
		// oxlint-disable-next-line complexity -- Starts the runtime modules in dependency order.
		start() {
			if (started || disposed || typeof document === 'undefined') {
				return;
			}
			started = true;
			if (disposers.length === 0) {
				disposers = wire();
			}

			if (options.windowDebug !== false) {
				const windowDebug = modules.createWindowDebug({
					mode: resolveWindowDebugMode(options.mode),
					pkg: options.pkg ?? '@c15t/core',
				});
				disposers.push(() => windowDebug.dispose());
			}

			const { persistence: persistenceOption } = options;
			if (enabled && !consentSource && persistenceOption !== false) {
				const { now, skipHydration, sync } =
					typeof persistenceOption === 'object' ? persistenceOption : {};
				const seed = options.prefetch?.initialRecords;
				const seeded = skipHydration ?? isRecordSeed(seed);
				const persistence = modules.createPersistence({
					kernel,
					now,
					skipHydration: seeded,
					storageConfig: storageFor(options),
					sync,
				});
				// Storage replaced the subject a backend named; keep the named
				// one when storage held none of its own.
				if (!seeded && seed?.subject && !kernel.getSnapshot().subject) {
					kernel.hydrate({ subject: seed.subject });
				}
				persistenceHandle = persistence;
				disposers.push(() => {
					persistence.dispose();
					persistenceHandle = null;
				});
			}
			if (enabled && consentSource) {
				disposers.push(modules.connectConsentSource(kernel, consentSource));
				kernel.events.emit({
					snapshot: kernel.getSnapshot(),
					type: 'init:applied',
				});
			}
			// After hydration, so a returning visitor's subject id seeds the
			// arm. The controller loads as its own chunk; a held prompt waits.
			if (enabled && experiment && !consentSource) {
				disposers.push(
					startExperiment({
						experiment,
						kernel,
						presentation: options.presentation,
						storageConfig: options.storageConfig,
						theme: options.theme,
					})
				);
			}

			// A server-resolved prefetch already holds the init answer; asking
			// for it again is one request per page load on every SSR route.
			if (enabled && !consentSource) {
				if (hasResolvedPrefetch(options.prefetch)) {
					// What the server rendered is the visitor's first impression,
					// so evaluate at its clock; a restart evaluates now.
					kernel.hydrate({
						now: adopted ? Date.now() : kernel.getServerSnapshot().evaluatedAt,
					});
					adopted = true;
					// No init call marks this kernel live, so do it here.
					kernel.markLive();
					const { gpc } = kernel.getSnapshot().privacySignals;
					if (gpc.detected && gpc.active) {
						kernel.set.privacySignals({ gpc: true });
					}
					// The prefetch stands in for the response, so replay the event
					// the applied response would have raised.
					kernel.events.emit({
						snapshot: kernel.getSnapshot(),
						type: 'init:applied',
					});
				} else {
					void runInit();
				}
			}

			// Not gated on `enabled`: a disabled runtime grants every category, so
			// the loader mounts the configured scripts straight away. Skipping it
			// would silently drop every consent-gated integration on a site that
			// turned consent management off.
			let loader: ScriptLoaderHandle | undefined;
			if (options.scripts && options.scripts.length > 0) {
				loader = modules.createScriptLoader({
					kernel,
					nonce: options.nonce,
					onDebug: options.scriptLoader?.onDebug,
					scripts: options.scripts,
				});
				const mounted = loader;
				disposers.push(() => mounted.dispose());
			}

			if (enabled && options.networkBlocker) {
				// Never omitted: without a hold, the blocker ends every caller's
				// hold, including ones a disabled blocker must not. A restart,
				// or a start after `releaseHold()`, holds again: a blocker that
				// loads on demand would otherwise let requests through until
				// its chunk lands.
				const claimed = hold ?? holdRequests() ?? NOT_HELD;
				hold = null;
				const blocker = modules.createNetworkBlocker({
					enabled: options.networkBlocker.enabled,
					hold: claimed,
					kernel,
					logBlockedRequests: options.networkBlocker.logBlockedRequests,
					onRequestBlocked: options.networkBlocker.onRequestBlocked,
					rules: options.networkBlocker.rules,
				});
				disposers.push(() => {
					blocker.dispose();
					// A lazy blocker disposed before it loaded never took the hold
					// over, and nothing checked consent for what it held: fail it
					// closed. A no-op once a blocker took over.
					claimed.block();
				});
			}

			if (enabled && options.iframeBlocker !== false) {
				const blocker = modules.createIframeBlocker({
					kernel,
					...(options.iframeBlocker ?? {}),
				});
				iframeBlocker = blocker;
				disposers.push(() => {
					iframeBlocker = null;
					blocker.dispose();
				});
			}

			const { createIAB, iab } = options;
			if (enabled && createIAB && iab && !consentSource && modules.mountIAB) {
				disposers.push(
					modules.mountIAB({ createIAB, iab, kernel, onHandle: emitIAB })
				);
			}
			const { clearOnRevocation } = options;
			if (enabled && clearOnRevocation) {
				// Data clearing subscribes after the script loader, so revocation
				// callbacks finish before browser data is removed. A loader that
				// loads on demand subscribes when its chunk lands.
				let cleanup: { dispose: () => void } | null = null;
				let cancelled = false;
				const mountCleanup = () => {
					if (!cancelled) {
						cleanup = modules.createClearOnRevocation({
							config: clearOnRevocation,
							kernel,
							storageConfig: storageFor(options),
						});
					}
				};
				disposers.push(() => {
					cancelled = true;
					cleanup?.dispose();
				});
				afterModuleLoaded(loader, mountCleanup);
			}
		},
		get started() {
			return started;
		},
	};
	const releaseHold = function releaseHold(): void {
		const held = hold;
		hold = null;
		held?.release()();
	};
	return { releaseHold, runtime, stop };
};
