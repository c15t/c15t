import {
	applyExperimentAssignment,
	applyExperimentTheme,
	custom,
	evaluateConsent,
	hosted,
	declareOwnedVendors,
	forgetOwnedVendors,
	isVendorAllowed,
	policyRulePresets,
} from '@c15t/core';
import type {
	AllConsentNames,
	ConsentPresentation,
	ConsentSnapshot,
	HasCondition,
	KernelActiveUI,
	KernelOverrides,
	KernelUser,
	PolicyRule,
	SaveResult,
	SaveInput,
	ProviderTransportFactory,
	ResolvedVendor,
	Unsubscribe,
} from '@c15t/core';
import type {
	ConsentRuntimeIABFactory,
	GPPModuleLoader,
	RuntimeGPPOptions,
} from '@c15t/core/runtime';
import {
	saveConsentSurface,
	saveIABConsentSurface,
	showConsentSurface,
} from '@c15t/core/surface-actions';
import type { Theme } from '@c15t/ui/theme';

import { createBrowserRuntime } from './create-runtime';
import { createDeferred } from './deferred';
import { createGatedScriptActivator } from './gated-scripts';
import { hasDecided } from './has-decided';
import { manifest } from './transports/manifest';
import { offline } from './transports/offline';
import type {
	ConsentClient,
	ConsentClientEventMap,
	ConsentClientOptions,
	ConsentModeName,
	ConsentSaveInput,
	ConsentUIHandle,
	ConsentUIMounter,
	ConsentUIOptions,
} from './types';

export { custom, hosted };

/** Attribute a page element can carry to drive the client on click. */
export const ACTION_ATTRIBUTE = 'data-c15t-action';

/** Link fragment that opens the preference centre, matching `@c15t/astro`. */
export const PREFERENCES_HASH = '#c15t-preferences';

/** Values `data-c15t-action` accepts. */
export type PageAction =
	| 'accept'
	| 'reject'
	| 'customize'
	| 'dismiss'
	| 'close'
	| 'banner';

const PAGE_ACTIONS: ReadonlySet<string> = new Set<PageAction>([
	'accept',
	'reject',
	'customize',
	'close',
	'dismiss',
	'banner',
]);

/** Extra wiring the entry points hand to the client. */
export interface CreateConsentClientContext {
	/** Install entry-specific globals before runtime initialization. */
	onStart?: (options: ConsentClientOptions) => () => void;
	/** Optional CMP factory supplied exclusively by the IAB entry. */
	createIAB?: ConsentRuntimeIABFactory;
	/** Loads `@c15t/iab/gpp`. Only the script-tag global supplies it. */
	loadGPP?: GPPModuleLoader;
	/** The `gpp` option when the page sets none. Off unless an entry sets it. */
	defaultGPP?: RuntimeGPPOptions | boolean;
	/** Mounts the prebuilt UI. Absent in the headless build. */
	mountUI?: ConsentUIMounter;
	/** Package name reported on `window.c15t`. */
	pkg?: string;
}

interface ResolvedMode {
	factory: ProviderTransportFactory;
	name: ConsentModeName | 'custom';
}

/**
 * Turn preset names into policy rules.
 *
 * @param policyRules - Rules, preset names, or a mix.
 * @returns Rules only, or `undefined` when none were given.
 * @throws {Error} On a name `policyRulePresets` does not export.
 */
export const resolveRules = function resolveRules(
	policyRules: ConsentClientOptions['policyRules']
): PolicyRule[] | undefined {
	if (!policyRules) {
		return undefined;
	}
	return policyRules.map((entry) => {
		if (typeof entry !== 'string') {
			return entry;
		}
		// Own keys only: `'constructor'` would otherwise resolve to Object.
		const preset = Object.hasOwn(policyRulePresets, entry)
			? (policyRulePresets[entry] as () => PolicyRule)
			: undefined;
		if (typeof preset !== 'function') {
			throw new Error(
				`@c15t/browser: unknown policy preset "${entry}". Expected one of ${Object.keys(policyRulePresets).join(', ')}.`
			);
		}
		return preset();
	});
};

const defaultModeName = function defaultModeName(
	options: ConsentClientOptions
): ConsentModeName {
	if (options.manifest || options.manifestURL) {
		return 'manifest';
	}
	return options.backendURL ? 'hosted' : 'offline';
};

const resolveMode = function resolveMode(
	options: ConsentClientOptions
): ResolvedMode {
	if (typeof options.mode === 'function') {
		const { kind } = options.mode;
		return {
			factory: options.mode,
			name: kind === 'hosted' || kind === 'offline' ? kind : 'custom',
		};
	}
	const name = options.mode ?? defaultModeName(options);
	if (name === 'hosted') {
		if (!options.backendURL) {
			throw new Error(
				'@c15t/browser: hosted mode needs `backendURL` (or data-backend-url on the script tag).'
			);
		}
		return { factory: hosted({ url: options.backendURL }), name };
	}
	if (name === 'manifest') {
		return {
			factory: manifest({
				backendURL: options.backendURL,
				inputs: options.overrides,
				manifest: options.manifest,
				manifestURL: options.manifestURL,
			}),
			name,
		};
	}
	return {
		factory: offline({ policyRules: resolveRules(options.policyRules) }),
		name,
	};
};

const dispatchDocumentEvent = function dispatchDocumentEvent(
	name: keyof ConsentClientEventMap,
	detail: unknown
): void {
	if (typeof document === 'undefined') {
		return;
	}
	document.dispatchEvent(new CustomEvent(`c15t:${name}`, { detail }));
};

/**
 * Run one `on()` listener so a throw is reported instead of stopping the
 * listeners after it and the matching `c15t:*` document event.
 */
const callListener = function callListener<PayloadType>(
	event: keyof ConsentClientEventMap,
	listener: (payload: PayloadType) => void,
	payload: PayloadType
): void {
	try {
		listener(payload);
	} catch (error) {
		// oxlint-disable-next-line no-console -- A page listener failed; keep dispatching.
		console.error(
			`@c15t/browser: a "${event}" listener threw; the other listeners still run.`,
			error
		);
	}
};

const NO_VENDORS: readonly ResolvedVendor[] = [];

const resolvePageAction = function resolvePageAction(
	target: EventTarget | null
): PageAction | null {
	if (!(target instanceof Element)) {
		return null;
	}
	const actionElement = target.closest(`[${ACTION_ATTRIBUTE}]`);
	const action = actionElement?.getAttribute(ACTION_ATTRIBUTE);
	if (action && PAGE_ACTIONS.has(action)) {
		return action as PageAction;
	}
	const link = target.closest('a[href]');
	const href = link?.getAttribute('href') ?? '';
	return href.endsWith(PREFERENCES_HASH) ? 'customize' : null;
};

/**
 * Create the page's consent client without starting it.
 *
 * Construction has no DOM or storage effects. Call {@link ConsentClient.start}
 * to hydrate stored records, resolve the policy and mount the UI.
 *
 * @param options - Client options.
 * @param context - Entry-point wiring.
 * @returns The client.
 * @throws {Error} When the mode cannot be resolved from the options.
 */
// oxlint-disable-next-line max-lines-per-function -- One cohesive lifecycle: construct, start, dispose.
export const createConsentClient = function createConsentClient(
	options: ConsentClientOptions = {},
	context: CreateConsentClientContext = {}
): ConsentClient {
	if (options.iab && options.iab.enabled !== false && !context.createIAB) {
		throw new Error('@c15t/browser: IAB requires the @c15t/browser/iab entry.');
	}
	const mode = resolveMode(options);
	const runtime = createBrowserRuntime({
		callbacks: options.callbacks,
		clearOnRevocation: options.clearOnRevocation,
		consentCategories: options.consentCategories,
		consentSource: options.consentSource,
		createIAB: context.createIAB,
		enabled: options.enabled,
		experiment: options.experiment,
		gpp: options.gpp ?? context.defaultGPP,
		i18n: options.i18n,
		iab: context.createIAB ? (options.iab ?? { enabled: true }) : undefined,
		iframeBlocker: options.iframeBlocker,
		loadGPP: context.loadGPP,
		mode: mode.factory,
		networkBlocker: options.networkBlocker,
		nonce: options.nonce,
		overrides: options.overrides,
		persistence: options.persistence,
		pkg: options.pkg ?? context.pkg ?? '@c15t/browser',
		policyRules: resolveRules(options.policyRules),
		prefetch: options.prefetch,
		presentation: options.presentation,
		reloadOnConsentRevoked: options.reloadOnConsentRevoked,
		scriptLoader: options.scriptLoader,
		scripts: options.scripts,
		storageConfig: options.storageConfig,
		theme: options.ui === false ? undefined : options.ui?.theme,
		user: options.user,
		vendors: options.vendors,
		// The script-tag build owns `window.c15t`; core must not overwrite it.
		windowDebug: false,
	});
	const { kernel } = runtime;
	// Inert tags own the vendor slugs they name, the way scripts, rules and
	// iframes do, so a stored denial holds before a backend declares them.
	const gatedVendorSource = Symbol('gated-scripts');
	const gatedScripts = createGatedScriptActivator(() => kernel.getSnapshot(), {
		declareVendors: (owners) =>
			declareOwnedVendors(kernel, owners, gatedVendorSource),
		nonce: options.nonce,
		registerCategories: kernel.set.registerConsentCategories,
	});
	let startingRuntime = false;
	let drainingRuntimeEvents = false;
	const pendingRuntimeEvents: (() => void)[] = [];

	const listeners: {
		[EventName in keyof ConsentClientEventMap]: Set<
			(payload: ConsentClientEventMap[EventName]) => void
		>;
	} = {
		consent: new Set(),
		error: new Set(),
		ready: new Set(),
		surfaceShown: new Set(),
		ui: new Set(),
	};
	const dispatch = function dispatch<
		EventName extends keyof ConsentClientEventMap,
	>(event: EventName, payload: ConsentClientEventMap[EventName]): void {
		for (const listener of listeners[event]) {
			callListener(event, listener, payload);
		}
		dispatchDocumentEvent(event, payload);
	};
	const emit = function emit<EventName extends keyof ConsentClientEventMap>(
		event: EventName,
		payload: ConsentClientEventMap[EventName]
	): void {
		if (startingRuntime || drainingRuntimeEvents) {
			pendingRuntimeEvents.push(() => dispatch(event, payload));
			return;
		}
		dispatch(event, payload);
	};

	const ready = createDeferred<ConsentSnapshot>();
	let readySnapshot: ConsentSnapshot | null = null;
	const completeReady = function completeReady(
		snapshot: ConsentSnapshot
	): void {
		if (readySnapshot) {
			return;
		}
		readySnapshot = snapshot;
		ready.resolve(snapshot);
		dispatch('ready', snapshot);
	};
	const markReady = function markReady(snapshot: ConsentSnapshot): void {
		if (startingRuntime || drainingRuntimeEvents) {
			// A ready listener may dispose the client. Let the runtime finish
			// registering its own resources before notifying browser listeners.
			pendingRuntimeEvents.push(() => completeReady(snapshot));
			return;
		}
		completeReady(snapshot);
	};

	let ui: ConsentUIHandle | null = null;
	let started = false;
	let disposed = false;
	let detachPageActions: (() => void) | null = null;

	const initial = kernel.getSnapshot();
	let lastActiveUI: KernelActiveUI = initial.activeUI;
	let lastConsents = initial.effectivePermissions;
	let lastHasConsented = initial.explicitChoice;
	let lastVendorChoice = initial.vendorChoice;
	let lastVendors = initial.vendors;
	const disposers: (() => void)[] = [
		gatedScripts.dispose,
		() => forgetOwnedVendors(kernel, gatedVendorSource),
		kernel.events.on('init:applied', ({ snapshot }) => {
			markReady(snapshot);
		}),
		kernel.events.on('command:error', ({ error }) => {
			emit('error', error);
		}),
		kernel.events.on('surface:shown', ({ type: _type, ...impression }) => {
			emit('surfaceShown', impression);
		}),
		// Saves and hydration can change permissions or explicit receipts;
		// one subscription observes both paths.
		kernel.subscribe((snapshot) => {
			// A vendor-only save changes neither permissions nor the category
			// receipt, and a declaration can make a stored denial count.
			if (
				snapshot.effectivePermissions !== lastConsents ||
				snapshot.explicitChoice !== lastHasConsented ||
				snapshot.vendorChoice !== lastVendorChoice ||
				snapshot.vendors !== lastVendors
			) {
				lastConsents = snapshot.effectivePermissions;
				lastHasConsented = snapshot.explicitChoice;
				lastVendorChoice = snapshot.vendorChoice;
				lastVendors = snapshot.vendors;
				if (started && !startingRuntime) {
					gatedScripts.scan();
				}
				emit('consent', snapshot);
			}
			if (snapshot.activeUI !== lastActiveUI) {
				lastActiveUI = snapshot.activeUI;
				emit('ui', snapshot.activeUI);
			}
		}),
	];

	// The categories the dialog offers: `necessary` plus the choice scope,
	// in core's fixed display order, as in the preference draft and every
	// framework.
	const categories = (): AllConsentNames[] => runtime.consentCategories;

	// Surfaces close and follow through core's surface actions: a save
	// closes on the local record, explicit navigation supersedes it.
	const closeSurfaces = (): void => showConsentSurface(kernel, 'none');
	const openDialog = (): void => showConsentSurface(kernel, 'dialog');
	const showBanner = (): void => showConsentSurface(kernel, 'banner');
	const saveSelection = (input: SaveInput): Promise<SaveResult> =>
		saveConsentSurface(kernel, () =>
			kernel.commands.save(input, { categories: categories() })
		);
	/**
	 * Save an IAB choice through the CMP, applying a blanket first. The IAB
	 * UI has no opt-in fallback: without the CMP and its vendor list it shows
	 * the error, so this reports one and confirms nothing.
	 */
	const saveIAB = async (blanket?: 'acceptAll' | 'rejectAll') => {
		const handle = runtime.iab;
		const snapshot = kernel.getSnapshot();
		try {
			if (
				!(handle && snapshot.iab?.gvl && snapshot.policyRule.model === 'iab')
			) {
				throw new Error('IAB privacy settings are not ready.');
			}
			return await saveIABConsentSurface(kernel, () => {
				if (blanket) {
					handle[blanket]();
				}
				return handle.save();
			});
		} catch (error) {
			emit('error', error instanceof Error ? error : new Error(String(error)));
			return { ok: false };
		}
	};
	const acceptAll = (): Promise<SaveResult> =>
		kernel.getSnapshot().policyRule.model === 'iab'
			? saveIAB('acceptAll')
			: saveSelection('all');
	const rejectAll = (): Promise<SaveResult> =>
		kernel.getSnapshot().policyRule.model === 'iab'
			? saveIAB('rejectAll')
			: saveSelection('none');

	const onPageClick = function onPageClick(event: MouseEvent): void {
		const action = resolvePageAction(event.target);
		if (!action) {
			return;
		}
		event.preventDefault();
		switch (action) {
			case 'accept': {
				void acceptAll();
				break;
			}
			case 'reject': {
				void rejectAll();
				break;
			}
			case 'customize': {
				openDialog();
				break;
			}
			case 'dismiss': {
				void kernel.commands.dismissNotice();
				break;
			}
			case 'banner': {
				showBanner();
				break;
			}
			default: {
				closeSurfaces();
			}
		}
	};

	const client: ConsentClient = {
		acceptAll,
		closeDialog: closeSurfaces,
		get consentCategories() {
			return categories();
		},
		dismissNotice: () => kernel.commands.dismissNotice(),
		dispose() {
			if (disposed) {
				return;
			}
			disposed = true;
			started = false;
			detachPageActions?.();
			detachPageActions = null;
			ui?.destroy();
			ui = null;
			for (const dispose of disposers.reverse()) {
				dispose();
			}
			disposers.length = 0;
			runtime.dispose();
		},
		getDeclaredVendors() {
			const snapshot = kernel.getSnapshot();
			return snapshot.model === 'iab'
				? NO_VENDORS
				: (snapshot.vendors?.declared ?? NO_VENDORS);
		},
		getSnapshot() {
			return kernel.getSnapshot();
		},
		getVendorChoice() {
			return kernel.getSnapshot().vendorChoice;
		},
		has(condition: HasCondition<AllConsentNames>) {
			const snapshot = kernel.getSnapshot();
			return evaluateConsent({ category: condition }, snapshot);
		},
		hasConsented() {
			return hasDecided(kernel.getSnapshot());
		},
		async identify(user: KernelUser) {
			await runtime.identify(user);
		},
		isVendorAllowed(vendorId: string) {
			return isVendorAllowed(kernel.getSnapshot(), vendorId);
		},
		kernel,
		mode: mode.name,
		mountUI(uiOptions?: ConsentUIOptions) {
			if (!context.mountUI) {
				throw new Error(
					'@c15t/browser: this build is headless. Load c15t.js, or import `mountConsentUI` from "@c15t/browser".'
				);
			}
			ui?.destroy();
			ui = context.mountUI(
				client,
				uiOptions ?? (options.ui === false ? undefined : options.ui)
			);
			return ui;
		},
		on(event, listener) {
			const set = listeners[event] as Set<typeof listener>;
			set.add(listener);
			// A listener attached after the fact still learns the runtime is
			// ready, the way a resolved promise would tell it; a `ui` listener
			// learns which surface is already up, so a custom banner wired
			// after a fast offline init does not miss its cue.
			if (event === 'ready' && readySnapshot) {
				callListener(
					event,
					listener as (payload: ConsentSnapshot) => void,
					readySnapshot
				);
			}
			if (event === 'ui' && readySnapshot) {
				callListener(
					event,
					listener as (payload: KernelActiveUI) => void,
					kernel.getSnapshot().activeUI
				);
			}
			return function unsubscribe() {
				set.delete(listener);
			};
		},
		openDialog,
		options,
		get presentation(): ConsentPresentation | undefined {
			return applyExperimentAssignment(
				options.presentation,
				runtime.experiment,
				kernel.getSnapshot().experiment
			);
		},
		processIframes() {
			runtime.processIframes();
		},
		ready() {
			return ready.promise;
		},
		rejectAll,
		runtime,
		save(consents: ConsentSaveInput) {
			if (kernel.getSnapshot().policyRule.model === 'iab') {
				emit('error', new Error('Use saveIAB() to confirm IAB preferences.'));
				return Promise.resolve({ ok: false });
			}
			const { vendors, ...rest } = consents;
			const allowed = new Set<string>(categories());
			const selection: Exclude<SaveInput, string> = Object.fromEntries(
				Object.entries(rest).filter(([name]) => allowed.has(name))
			);
			if (vendors) {
				selection.vendors = { ...vendors };
			}
			return saveSelection(selection);
		},
		saveIAB: () => saveIAB(),
		setLanguage(code: string) {
			runtime.setLanguage(code);
		},
		setOverrides(overrides: KernelOverrides) {
			runtime.setOverrides(overrides);
		},
		showBanner,
		start() {
			if (started || disposed || typeof document === 'undefined') {
				return;
			}
			started = true;
			if (context.onStart && options.enabled !== false) {
				disposers.push(context.onStart(options));
			}
			startingRuntime = true;
			try {
				runtime.start();
			} finally {
				startingRuntime = false;
			}
			drainingRuntimeEvents = true;
			try {
				// Listener-triggered events follow notifications already queued.
				for (const notify of pendingRuntimeEvents) {
					if (disposed) {
						break;
					}
					notify();
				}
			} finally {
				drainingRuntimeEvents = false;
				pendingRuntimeEvents.length = 0;
			}
			if (disposed) {
				return;
			}
			// Inert `<script type="text/plain" data-c15t-category>` tags a
			// returning visitor already consented to run straight away.
			gatedScripts.scan();
			if (disposed) {
				return;
			}
			const observer = new MutationObserver(() => gatedScripts.scan());
			observer.observe(document.documentElement, {
				childList: true,
				subtree: true,
			});
			disposers.push(() => observer.disconnect());
			if (options.enabled === false) {
				// Nothing will ever resolve a policy; do not leave `ready()`
				// hanging for callers that gate analytics on it.
				markReady(kernel.getSnapshot());
				if (disposed) {
					return;
				}
			}
			document.addEventListener('click', onPageClick);
			detachPageActions = () => {
				document.removeEventListener('click', onPageClick);
			};
			if (options.ui === false || !context.mountUI) {
				return;
			}
			// A script in `<head>` runs before `<body>` exists; the runtime can
			// start now, the UI has to wait for somewhere to mount.
			const mount = function mount(): void {
				if (!(disposed || ui)) {
					ui = client.mountUI();
				}
			};
			if (document.body) {
				mount();
				return;
			}
			document.addEventListener('DOMContentLoaded', mount, { once: true });
			disposers.push(() => {
				document.removeEventListener('DOMContentLoaded', mount);
			});
		},
		get started() {
			return started;
		},
		subscribe(listener) {
			return kernel.subscribe(listener);
		},
		get theme(): Theme | undefined {
			// A headless client renders nothing, so an arm's theme has nothing
			// to override; the getter stays `undefined` whatever is assigned.
			if (options.ui === false) {
				return undefined;
			}
			return applyExperimentTheme(
				options.ui?.theme,
				runtime.experiment,
				kernel.getSnapshot().experiment
			);
		},
		get ui() {
			return ui;
		},
	};

	return client;
};

/**
 * Create and start a client in one call.
 *
 * @param options - Client options.
 * @param context - Entry-point wiring.
 * @returns The started client.
 */
export const initConsentClient = function initConsentClient(
	options: ConsentClientOptions = {},
	context: CreateConsentClientContext = {}
): ConsentClient {
	const client = createConsentClient(options, context);
	client.start();
	return client;
};

export type { Unsubscribe };
