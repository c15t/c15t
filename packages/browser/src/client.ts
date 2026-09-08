import {
	allConsentNames,
	consentTypes,
	custom,
	defaultTranslationConfig,
	has,
	hosted,
	policyPackPresets,
} from '@c15t/core';
import type {
	ActiveUI,
	AllConsentNames,
	ConsentSnapshot,
	ConsentState,
	ConsentType,
	HasCondition,
	KernelActiveUI,
	KernelOverrides,
	KernelUser,
	PolicyConfig,
	PolicyUiSurfaceConfig,
	ProviderTransportFactory,
	TranslationConfig,
	Unsubscribe,
} from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';

import { createDeferred } from './deferred';
import { activateGatedScripts } from './gated-scripts';
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
	SaveType,
} from './types';

export { custom, hosted };

/** Attribute a page element can carry to drive the client on click. */
export const ACTION_ATTRIBUTE = 'data-c15t-action';

/** Link fragment that opens the preference centre, matching `@c15t/astro`. */
export const PREFERENCES_HASH = '#c15t-preferences';

/** Values `data-c15t-action` accepts. */
export type PageAction = 'accept' | 'reject' | 'customize' | 'close' | 'banner';

const PAGE_ACTIONS: ReadonlySet<string> = new Set<PageAction>([
	'accept',
	'reject',
	'customize',
	'close',
	'banner',
]);

/** Extra wiring the entry points hand to the client. */
export interface CreateConsentClientContext {
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
 * Turn preset names into policy packs.
 *
 * @param policies - Packs, preset names, or a mix.
 * @returns Packs only, or `undefined` when none were given.
 * @throws {Error} On a name `policyPackPresets` does not export.
 */
export const resolvePolicies = function resolvePolicies(
	policies: ConsentClientOptions['policies']
): PolicyConfig[] | undefined {
	if (!policies) {
		return undefined;
	}
	return policies.map((entry) => {
		if (typeof entry !== 'string') {
			return entry;
		}
		const preset = policyPackPresets[entry] as (() => PolicyConfig) | undefined;
		if (typeof preset !== 'function') {
			throw new Error(
				`@c15t/browser: unknown policy preset "${entry}". Expected one of ${Object.keys(policyPackPresets).join(', ')}.`
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
		factory: offline({ policyPacks: resolvePolicies(options.policies) }),
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
	const { policyCategories } = snapshot;
	const available = policyCategories.some(
		(category) => category !== 'necessary'
	)
		? policyCategories
		: allConsentNames;
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

const EMPTY_POLICY_SURFACE: PolicyUiSurfaceConfig = {};

const toTranslationConfig = function toTranslationConfig(
	snapshot: ConsentSnapshot
): TranslationConfig {
	const resolved = snapshot.translations;
	if (!resolved) {
		return defaultTranslationConfig;
	}
	return {
		...defaultTranslationConfig,
		defaultLanguage: resolved.language,
		translations: {
			...defaultTranslationConfig.translations,
			[resolved.language]: resolved.translations,
		},
	};
};

const displayedConsentTypes = function displayedConsentTypes(
	categories: readonly AllConsentNames[]
): ConsentType[] {
	const allowed = new Set(categories);
	return consentTypes
		.filter((type) => allowed.has(type.name))
		.map((type) => ({ ...type, display: true }));
};

/**
 * Create the page's consent client without starting it.
 *
 * Construction hydrates stored consent synchronously, so a returning
 * visitor's first paint already knows there is nothing to show. Call
 * {@link ConsentClient.start} to resolve the policy and mount the UI.
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
	const mode = resolveMode(options);
	const configuredCategories = options.consentCategories ?? [];
	const runtime = createConsentRuntime({
		callbacks: options.callbacks,
		consentCategories: options.consentCategories,
		enabled: options.enabled,
		i18n: options.i18n,
		iframeBlocker: options.iframeBlocker,
		mode: mode.factory,
		networkBlocker: options.networkBlocker,
		overrides: options.overrides,
		pkg: options.pkg ?? context.pkg ?? '@c15t/browser',
		policies: resolvePolicies(options.policies),
		prefetch: options.prefetch,
		reloadOnConsentRevoked: options.reloadOnConsentRevoked,
		scripts: options.scripts,
		storageConfig: options.storageConfig,
		user: options.user,
		// The script-tag build owns `window.c15t`; core must not overwrite it.
		windowDebug: false,
	});
	const { kernel } = runtime;

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
	const emit = function emit<EventName extends keyof ConsentClientEventMap>(
		event: EventName,
		payload: ConsentClientEventMap[EventName]
	): void {
		for (const listener of listeners[event]) {
			listener(payload);
		}
		dispatchDocumentEvent(event, payload);
	};

	const ready = createDeferred<ConsentSnapshot>();
	let readySnapshot: ConsentSnapshot | null = null;
	const markReady = function markReady(snapshot: ConsentSnapshot): void {
		if (readySnapshot) {
			return;
		}
		readySnapshot = snapshot;
		ready.resolve(snapshot);
		emit('ready', snapshot);
	};

	let ui: ConsentUIHandle | null = null;
	let started = false;
	let disposed = false;
	let detachPageActions: (() => void) | null = null;

	const initial = kernel.getSnapshot();
	let lastActiveUI: KernelActiveUI = initial.activeUI;
	let lastConsents = initial.consents;
	let lastHasConsented = initial.hasConsented;
	const disposers: (() => void)[] = [
		kernel.events.on('init:applied', ({ snapshot }) => {
			markReady(snapshot);
		}),
		kernel.events.on('init:failed', ({ error }) => {
			emit('error', error);
		}),
		// One subscription rather than per-command events: a save, a draft
		// write and a hydration all change `consents`, and listeners want
		// every one of them.
		kernel.subscribe((snapshot) => {
			if (
				snapshot.consents !== lastConsents ||
				snapshot.hasConsented !== lastHasConsented
			) {
				lastConsents = snapshot.consents;
				lastHasConsented = snapshot.hasConsented;
				if (started) {
					activateGatedScripts(snapshot);
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

	// Toggles in the preference centre stage here until saved, the way
	// React's `useConsentDraft` does; closing any surface discards them.
	let draft: Partial<ConsentState> = {};

	// The actions the UI, the page and the API all share.
	const closeSurfaces = function closeSurfaces(): void {
		draft = {};
		kernel.set.activeUI('none');
	};
	const openDialog = function openDialog(): void {
		kernel.set.activeUI('dialog');
	};
	const showBanner = function showBanner(): void {
		kernel.set.activeUI('banner');
	};
	const acceptAll = async function acceptAll(): Promise<void> {
		closeSurfaces();
		await kernel.commands.save('all', { categories: categories() });
	};
	const rejectAll = async function rejectAll(): Promise<void> {
		closeSurfaces();
		await kernel.commands.save('none', { categories: categories() });
	};
	const save = async function save(
		consents: Partial<ConsentState>
	): Promise<void> {
		const allowed = new Set<string>(categories());
		closeSurfaces();
		await kernel.commands.save(
			Object.fromEntries(
				Object.entries(consents).filter(([name]) => allowed.has(name))
			),
			{ categories: categories() }
		);
	};
	const saveConsents = async function saveConsents(
		type: SaveType
	): Promise<void> {
		if (type === 'all') {
			await acceptAll();
			return;
		}
		if (type === 'necessary') {
			await rejectAll();
			return;
		}
		await save(draft);
	};

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
			case 'banner': {
				showBanner();
				break;
			}
			default: {
				closeSurfaces();
			}
		}
	};

	const draftListeners = new Set<() => void>();

	const client: ConsentClient = {
		acceptAll,
		get activeUI() {
			return (kernel.getSnapshot().activeUI ?? 'none') as ActiveUI;
		},
		get branding() {
			return kernel.getSnapshot().branding ?? 'c15t';
		},
		closeDialog: closeSurfaces,
		get consentCategories() {
			return categories();
		},
		get consentInfo() {
			return kernel.getSnapshot().hasConsented ? { type: 'v3' as const } : null;
		},
		get consentTypes() {
			return displayedConsentTypes(categories());
		},
		get consents() {
			return kernel.getSnapshot().consents;
		},
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
		getDisplayedConsents() {
			return displayedConsentTypes(categories());
		},
		getSnapshot() {
			return kernel.getSnapshot();
		},
		has(condition: HasCondition<AllConsentNames>) {
			const snapshot = kernel.getSnapshot();
			const policyCategories = Array.from(snapshot.policyCategories);
			return has(condition, snapshot.consents as ConsentState, {
				policyCategories: policyCategories.length > 0 ? policyCategories : null,
				policyScopeMode: snapshot.policyScopeMode,
			});
		},
		hasConsented() {
			return kernel.getSnapshot().hasConsented;
		},
		async identify(user: KernelUser) {
			await runtime.identify(user);
		},
		kernel,
		get location() {
			return kernel.getSnapshot().location;
		},
		mode: mode.name,
		get model() {
			return (kernel.getSnapshot().model ?? 'opt-in') as ConsentClient['model'];
		},
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
		get overrides() {
			return kernel.getSnapshot().overrides;
		},
		get policy() {
			return kernel.getSnapshot().policy;
		},
		get policyBanner() {
			return kernel.getSnapshot().policyBanner ?? EMPTY_POLICY_SURFACE;
		},
		get policyCategories() {
			return Array.from(kernel.getSnapshot().policyCategories);
		},
		get policyDialog() {
			return kernel.getSnapshot().policyDialog ?? EMPTY_POLICY_SURFACE;
		},
		get policyScopeMode() {
			return kernel.getSnapshot().policyScopeMode;
		},
		ready() {
			return ready.promise;
		},
		rejectAll,
		runtime,
		save,
		saveConsents,
		get selectedConsents() {
			return draft;
		},
		setActiveUI(surface: ActiveUI) {
			if (surface === 'none') {
				closeSurfaces();
				return;
			}
			kernel.set.activeUI(surface as KernelActiveUI);
		},
		setConsent(name: AllConsentNames, value: boolean) {
			kernel.set.consent({ [name]: value } as Partial<ConsentState>);
		},
		setLanguage(code: string) {
			kernel.set.language(code);
			void kernel.commands.init();
		},
		setOverrides(overrides: KernelOverrides) {
			runtime.setOverrides(overrides);
		},
		setSelectedConsent(name: AllConsentNames, value: boolean) {
			draft = { ...draft, [name]: value };
			// Surfaces re-render off the kernel; nudge them without changing it.
			for (const listener of draftListeners) {
				listener();
			}
		},
		showBanner,
		start() {
			if (started || disposed || typeof document === 'undefined') {
				return;
			}
			started = true;
			runtime.start();
			// Inert `<script type="text/plain" data-c15t-category>` tags a
			// returning visitor already consented to run straight away.
			activateGatedScripts(kernel.getSnapshot());
			if (options.enabled === false) {
				// Nothing will ever resolve a policy; do not leave `ready()`
				// hanging for callers that gate analytics on it.
				markReady(kernel.getSnapshot());
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
		get subjectId() {
			return kernel.getSnapshot().subjectId;
		},
		subscribe(listener) {
			const unsubscribeKernel = kernel.subscribe(listener);
			// Draft changes reach subscribers too, so the prebuilt widget and a
			// custom UI both see a staged toggle.
			const onDraft = () => {
				listener(kernel.getSnapshot());
			};
			draftListeners.add(onDraft);
			return function unsubscribe() {
				draftListeners.delete(onDraft);
				unsubscribeKernel();
			};
		},
		subscribeToConsentChanges(listener) {
			let last = kernel.getSnapshot().consents;
			return kernel.subscribe((snapshot) => {
				if (snapshot.consents !== last) {
					last = snapshot.consents;
					listener(snapshot.consents as ConsentState);
				}
			});
		},
		get translationConfig() {
			return toTranslationConfig(kernel.getSnapshot());
		},
		get translations() {
			return kernel.getSnapshot().translations;
		},
		get ui() {
			return ui;
		},
		get user() {
			return kernel.getSnapshot().user;
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
