import { custom, evaluateConsent, hosted, policyRulePresets } from '@c15t/core';
import type {
	AllConsentNames,
	ConsentSnapshot,
	ConsentState,
	HasCondition,
	KernelActiveUI,
	KernelOverrides,
	KernelUser,
	PolicyRule,
	SaveResult,
	SaveInput,
	ProviderTransportFactory,
	Unsubscribe,
} from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntimeIABFactory } from '@c15t/core/runtime';

import { createDeferred } from './deferred';
import { createGatedScriptActivator } from './gated-scripts';
import { manifest } from './transports/manifest';
import { offline } from './transports/offline';
import type {
	ConsentClient,
	ConsentClientEventMap,
	ConsentClientOptions,
	ConsentModeName,
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

/**
 * Categories the UI should offer: the configured list intersected with
 * what the resolved policy allows, always including `necessary`.
 */
const resolveConsentCategories = function resolveConsentCategories(
	snapshot: ConsentSnapshot,
	configured: readonly AllConsentNames[]
): AllConsentNames[] {
	const available: AllConsentNames[] = [
		'necessary',
		...snapshot.policyRule.scope,
	];
	if (configured.length === 0) {
		return Array.from(available);
	}
	const allowed = new Set(available);
	return Array.from(
		new Set<AllConsentNames>([
			'necessary',
			...configured.filter((category) => allowed.has(category)),
		])
	);
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
	const configuredCategories = options.consentCategories ?? [];
	const runtime = createConsentRuntime({
		callbacks: options.callbacks,
		clearOnRevocation: options.clearOnRevocation,
		consentCategories: options.consentCategories,
		createIAB: context.createIAB,
		enabled: options.enabled,
		i18n: options.i18n,
		iab: context.createIAB ? (options.iab ?? { enabled: true }) : undefined,
		iframeBlocker: options.iframeBlocker,
		mode: mode.factory,
		networkBlocker: options.networkBlocker,
		overrides: options.overrides,
		pkg: options.pkg ?? context.pkg ?? '@c15t/browser',
		policyRules: resolveRules(options.policyRules),
		prefetch: options.prefetch,
		presentation: options.presentation,
		scripts: options.scripts,
		storageConfig: options.storageConfig,
		user: options.user,
		// The script-tag build owns `window.c15t`; core must not overwrite it.
		windowDebug: false,
	});
	const { kernel } = runtime;
	const gatedScripts = createGatedScriptActivator(() => kernel.getSnapshot());
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
		ui: new Set(),
	};
	const dispatch = function dispatch<
		EventName extends keyof ConsentClientEventMap,
	>(event: EventName, payload: ConsentClientEventMap[EventName]): void {
		for (const listener of listeners[event]) {
			listener(payload);
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
	const disposers: (() => void)[] = [
		gatedScripts.dispose,
		kernel.events.on('init:applied', ({ snapshot }) => {
			markReady(snapshot);
		}),
		kernel.events.on('command:error', ({ error }) => {
			emit('error', error);
		}),
		// Saves and hydration can change permissions or explicit receipts;
		// one subscription observes both paths.
		kernel.subscribe((snapshot) => {
			if (
				snapshot.effectivePermissions !== lastConsents ||
				snapshot.explicitChoice !== lastHasConsented
			) {
				lastConsents = snapshot.effectivePermissions;
				lastHasConsented = snapshot.explicitChoice;
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

	const categories = function categories(): AllConsentNames[] {
		return resolveConsentCategories(kernel.getSnapshot(), configuredCategories);
	};

	// Explicit navigation invalidates an older save's attempt to close the UI.
	let navigation = 0;
	const closeSurfaces = (): void => {
		navigation += 1;
		kernel.set.activeUI('none');
	};
	const openDialog = (): void => {
		navigation += 1;
		kernel.set.activeUI('dialog');
	};
	const showBanner = (): void => {
		navigation += 1;
		kernel.set.activeUI('banner');
	};
	const saveSelection = async (input: SaveInput): Promise<SaveResult> => {
		navigation += 1;
		const current = navigation;
		const surface = kernel.getSnapshot().activeUI;
		const { fingerprint } = kernel.getSnapshot().evaluationPolicy.choice;
		const pending = kernel.commands.save(input, { categories: categories() });
		// Local recording can close the surface before the transport answers.
		kernel.set.activeUI(surface);
		const result = await pending;
		if (
			result.ok &&
			current === navigation &&
			fingerprint === kernel.getSnapshot().evaluationPolicy.choice.fingerprint
		) {
			kernel.set.activeUI(
				kernel.getSnapshot().promptRequirement.kind === 'none'
					? 'none'
					: 'banner'
			);
		}
		return result;
	};
	const saveIAB = async (blanket?: boolean): Promise<SaveResult> => {
		const handle = runtime.iab;
		if (
			!handle ||
			!kernel.getSnapshot().iab?.gvl ||
			kernel.getSnapshot().policyRule.model !== 'iab'
		) {
			emit('error', new Error('IAB privacy settings are not ready.'));
			return { ok: false };
		}
		navigation += 1;
		const current = navigation;
		const snapshot = kernel.getSnapshot();
		try {
			if (blanket === true) {
				handle.acceptAll();
			}
			if (blanket === false) {
				handle.rejectAll();
			}
			await handle.save();
			const next = kernel.getSnapshot();
			if (
				!next.iab?.authority ||
				next.evaluationPolicy.choice.fingerprint !==
					snapshot.evaluationPolicy.choice.fingerprint
			) {
				return { ok: false };
			}
			if (current === navigation) {
				kernel.set.activeUI('none');
			}
			return { ok: true };
		} catch (error) {
			if (current === navigation) {
				kernel.set.activeUI(snapshot.activeUI);
			}
			emit('error', error instanceof Error ? error : new Error(String(error)));
			return { ok: false };
		}
	};
	const acceptAll = (): Promise<SaveResult> =>
		kernel.getSnapshot().policyRule.model === 'iab'
			? saveIAB(true)
			: saveSelection('all');
	const rejectAll = (): Promise<SaveResult> =>
		kernel.getSnapshot().policyRule.model === 'iab'
			? saveIAB(false)
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
			navigation += 1;
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
		getSnapshot() {
			return kernel.getSnapshot();
		},
		has(condition: HasCondition<AllConsentNames>) {
			const snapshot = kernel.getSnapshot();
			return evaluateConsent({ category: condition }, snapshot);
		},
		hasConsented() {
			return kernel.getSnapshot().explicitChoice !== null;
		},
		async identify(user: KernelUser) {
			await runtime.identify(user);
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
				(listener as (payload: ConsentSnapshot) => void)(readySnapshot);
			}
			if (event === 'ui' && readySnapshot) {
				(listener as (payload: KernelActiveUI) => void)(
					kernel.getSnapshot().activeUI
				);
			}
			return function unsubscribe() {
				set.delete(listener);
			};
		},
		openDialog,
		options,
		ready() {
			return ready.promise;
		},
		rejectAll,
		runtime,
		save(consents: Partial<ConsentState>) {
			if (kernel.getSnapshot().policyRule.model === 'iab') {
				emit('error', new Error('Use saveIAB() to confirm IAB preferences.'));
				return Promise.resolve({ ok: false });
			}
			const allowed = new Set<string>(categories());
			return saveSelection(
				Object.fromEntries(
					Object.entries(consents).filter(([name]) => allowed.has(name))
				)
			);
		},
		saveIAB: () => saveIAB(),
		setLanguage(code: string) {
			kernel.set.language(code);
			void kernel.commands.init();
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
