import type {
	AllConsentNames,
	ConsentState,
	HasCondition,
	Script,
	ScriptCallbackInfo,
} from '@c15t/core';
import { has } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { requireId } from '../_shared/required-id';
import { trimToUndefined } from '../_shared/script-url';

/** Recording mode that Sentry Replay reports while it records. */
export type SentryReplayRecordingMode = 'session' | 'buffer';

/**
 * The Sentry Replay methods the adapter uses. The integration returned by
 * `replayIntegration()` from `@sentry/browser` 10.67.0 or later, or from a
 * framework SDK built on it, matches this shape.
 */
export interface SentryReplay {
	name: string;
	start: () => void;
	startBuffering: () => void;
	stop: (options?: { flush?: boolean }) => Promise<void>;
	getRecordingMode: () => SentryReplayRecordingMode | undefined;
}

/** The part of a Sentry event the adapter changes. */
export interface SentryEvent {
	user?: unknown;
}

/** The parts of a Sentry session that identify the visitor. */
export interface SentrySession {
	did?: unknown;
	ipAddress?: unknown;
	attrs?: { ip_address?: unknown };
}

/** User data in the shape `Sentry.setUser` accepts. */
export interface SentryUser {
	id?: string | number;
	email?: string;
	username?: string;
	[key: string]: unknown;
}

/**
 * The Sentry client methods the adapter uses. `getClient()` from any Sentry
 * browser SDK returns a matching client.
 */
export interface SentryClient {
	addIntegration: (integration: SentryReplay) => void;
	addEventProcessor: (
		processor: <EventType extends SentryEvent>(event: EventType) => EventType
	) => void;
	captureException: (
		exception: unknown,
		hint?: { captureContext?: { tags?: Record<string, string> } }
	) => unknown;
	getDataCollectionOptions?: () => { userInfo?: boolean };
	getDsn: () => unknown;
	getIntegrationByName: (name: string) => unknown;
	getOptions: () => { enabled?: boolean };
	getSdkMetadata?: () =>
		| { sdk?: { settings?: { infer_ip?: string } } }
		| undefined;
	on?: (
		hook: 'beforeSendSession',
		callback: (session: SentrySession) => void
	) => unknown;
}

/**
 * When Sentry runs.
 *
 * - `always`: error monitoring runs for every visitor.
 * - `after-consent`: Sentry starts, and sends anything, only once
 *   `measurement` is allowed.
 */
export type SentryLoadMode = 'always' | 'after-consent';

export interface SentryReplayOptions {
	/**
	 * Permission Replay needs before it loads or records.
	 * @default 'measurement'
	 */
	category?: HasCondition<AllConsentNames>;
	/**
	 * Returns a new `replayIntegration()`. Called at most once per Sentry
	 * client, the first time Replay is allowed. Keep `replayIntegration` in a
	 * module of its own and import it dynamically here, so the recorder
	 * downloads only after consent.
	 */
	load: () => SentryReplay | Promise<SentryReplay>;
}

export interface SentryCdnReplayOptions {
	/**
	 * Permission Replay needs before it loads or records.
	 * @default 'measurement'
	 */
	category?: HasCondition<AllConsentNames>;
	/** Options for `replayIntegration()`, such as `maskAllText`. */
	options?: Record<string, unknown>;
}

export interface SentryPiiOptions {
	/**
	 * Permission Sentry needs before events carry user data and Sentry
	 * infers visitor IP addresses.
	 * @default 'measurement'
	 */
	category?: HasCondition<AllConsentNames>;
	/** Returns the user to pass to `setUser` when the permission is allowed. */
	user?: () => SentryUser | null | undefined;
}

interface SentrySharedOptions {
	/**
	 * When Sentry runs. With `after-consent` and your own SDK, pass `init`.
	 * @default 'always'
	 */
	loadMode?: SentryLoadMode;
	/** Gate user data on events, sessions and IP inference. */
	pii?: SentryPiiOptions;
	/**
	 * Receives Sentry start and Replay load, start and stop failures.
	 * Without it, the adapter reports them to Sentry with the tag
	 * `c15t.integration: sentry`.
	 */
	onError?: (error: unknown) => void;
}

/** c15t loads Sentry from Sentry's CDN and calls `Sentry.init`. */
export interface SentryCdnOptions extends SentrySharedOptions {
	/** Your project's DSN, from Sentry's project settings. */
	dsn: string;
	/**
	 * Options for `Sentry.init`, such as `release`, `environment`,
	 * `tracesSampleRate` and the Replay sample rates. `integrations` runs
	 * after Sentry loads, so it can read `window.Sentry`.
	 */
	initOptions?: Record<string, unknown>;
	/**
	 * Sentry SDK version to load. The default version loads with subresource
	 * integrity; another version loads without it.
	 * @default '11.4.0'
	 */
	version?: string;
	/**
	 * Load the bundle with tracing and add `browserTracingIntegration()`.
	 * @default true when `initOptions` sets `tracesSampleRate` or `tracesSampler`
	 */
	tracing?: boolean;
	/**
	 * Session Replay. Loads `replay.min.js` once Replay is allowed and the
	 * Replay sample rates in `initOptions` are above 0. `false` never loads it.
	 */
	replay?: SentryCdnReplayOptions | false;
	getClient?: never;
}

/** Your app runs the Sentry SDK, from npm or a script tag. */
export interface SentrySdkOptions extends SentrySharedOptions {
	/**
	 * Returns the app's Sentry client. Pass `getClient` from your Sentry SDK.
	 * It is read on every consent change, so the adapter also works when
	 * c15t starts before `Sentry.init`.
	 */
	getClient: () => SentryClient | undefined;
	/**
	 * `setUser` from your Sentry SDK. Called with `null` while user data is
	 * not allowed, and with `pii.user()` when it becomes allowed.
	 */
	setUser?: (user: SentryUser | null) => void;
	/**
	 * Starts Sentry, for example `() => import('./instrument')`. c15t calls it
	 * once, when `loadMode` allows Sentry to run. Required with
	 * `loadMode: 'after-consent'`.
	 */
	init?: () => unknown;
	/** Gate Session Replay. Without it, the adapter only stops a Replay the app added itself. */
	replay?: SentryReplayOptions;
	dsn?: never;
}

export type SentryOptions = SentryCdnOptions | SentrySdkOptions;

/** The `window.Sentry` functions a Sentry CDN bundle provides. */
interface SentryGlobal {
	init: (options: Record<string, unknown>) => unknown;
	getClient: () => SentryClient | undefined;
	setUser: (user: SentryUser | null) => void;
	replayIntegration?: (options?: Record<string, unknown>) => unknown;
	browserTracingIntegration?: () => { name: string };
}

interface Permissions {
	errors: boolean;
	pii: boolean;
	replay: boolean;
}

interface ClientState {
	/** Whether the app left the client enabled. The adapter never enables it past that. */
	enabled: boolean;
	/** Whether events may carry user data. Read by the event processor. */
	piiAllowed: boolean;
	/** `dataCollection.userInfo` as the app configured it. */
	userInfo?: boolean;
	/** The SDK `infer_ip` setting as the app configured it. */
	inferIp?: string;
	/** The `load()` call for this client, shared by every adapter instance. */
	loading?: Promise<SentryReplay>;
	/**
	 * Sampling decision Replay made when it was added, restored on re-grant.
	 * `null` means Replay did not sample this session.
	 */
	mode?: SentryReplayRecordingMode | null;
	/** Settles once the latest `stop()` finishes. */
	stopping?: Promise<void>;
}

interface GateOptions {
	getClient: () => SentryClient | undefined;
	setUser?: (user: SentryUser | null) => void;
	/** Whether error monitoring waits for `measurement`. */
	errorsGated: boolean;
	/** Whether c15t calls `Sentry.init`, so it sees the client from the start. */
	startsSentry: boolean;
	/** Starts Sentry the first time it may run. */
	start?: () => Promise<void>;
	loadReplay?: () => SentryReplay | Promise<SentryReplay>;
	replayCategory: HasCondition<AllConsentNames>;
	piiCategory: HasCondition<AllConsentNames>;
	user?: () => SentryUser | null | undefined;
	onError?: (error: unknown) => void;
}

const scriptId = 'sentry';
const replayName = 'Replay';
const tracingName = 'BrowserTracing';
/** sessionStorage key where Sentry Replay keeps its session. */
const replaySessionKey = 'sentryReplaySession';
const defaultCategory: AllConsentNames = 'measurement';
const errorsCategory: AllConsentNames = 'measurement';
/** Background tabs do not paint; start Replay after this long anyway. */
const paintTimeoutMs = 5000;
const idleTimeoutMs = 2000;
/** How long to keep checking for a client when Sentry initializes late. */
const clientRetryDelaysMs = [500, 1000, 2000, 4000, 8000, 16_000];
const errorTags = { 'c15t.integration': 'sentry' };
/** What a visitor who turned the Sentry vendor off grants: nothing optional. */
const ALL_DENIED: ConsentState = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

const cdnBaseUrl = 'https://browser.sentry-cdn.com';
const defaultVersion = '11.4.0';
const errorsBundle = 'bundle.min.js';
const tracingBundle = 'bundle.tracing.min.js';
const replayBundle = 'replay.min.js';
/** Subresource integrity for the files of the default version. */
const defaultIntegrity: Record<string, string> = {
	[errorsBundle]:
		'sha384-yR8WDlaM5tdf6UYPdUkCyZhW0OUuGNnKT8haW281Se9cj9eZP3z+iKwFvivogWnz',
	[replayBundle]:
		'sha384-mwyc35qA4ycC37dBKk3A7bdqEVGlz8Tk4XkoS0DE4B/No3NgDuhHiofBKNu9PPQh',
	[tracingBundle]:
		'sha384-leCZtyH0v+/d38CQgHkDf/buaYk8uIH2vrAwzlLXVLKTcrvUWEUGan36c9ooM12N',
};

// Sentry allows one Replay per page, and an app can recreate this script on
// every render, so Replay bookkeeping lives with the client, not the adapter.
const clientStates = new WeakMap<SentryClient, ClientState>();
// The same applies to starting Sentry: one start per `getClient`.
const starts = new WeakMap<() => SentryClient | undefined, Promise<void>>();

const isProduction = (): boolean =>
	(globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
		?.NODE_ENV === 'production';

const warn = (message: string): void => {
	if (!isProduction()) {
		console.warn(`[c15t] ${message}`);
	}
};

const getSentryGlobal = (): SentryGlobal | undefined =>
	(globalThis as { Sentry?: SentryGlobal }).Sentry;

const isReplay = (value: unknown): value is SentryReplay =>
	typeof value === 'object' &&
	value !== null &&
	'stop' in value &&
	typeof value.stop === 'function' &&
	'start' in value &&
	typeof value.start === 'function' &&
	'startBuffering' in value &&
	typeof value.startBuffering === 'function' &&
	'getRecordingMode' in value &&
	typeof value.getRecordingMode === 'function';

const findReplay = (client: SentryClient): SentryReplay | undefined => {
	const integration = client.getIntegrationByName(replayName);
	return isReplay(integration) ? integration : undefined;
};

/**
 * Remove the Replay session id. Sentry clears it when it stops a recording,
 * but keeps it for a session it did not sample.
 */
const forgetReplaySession = (): void => {
	try {
		globalThis.sessionStorage?.removeItem(replaySessionKey);
	} catch {
		// Storage can be blocked; Sentry then keeps no session either.
	}
};

/** Point Sentry's user data settings at the current permission. */
const applyPii = (client: SentryClient, state: ClientState): void => {
	const dataCollection = client.getDataCollectionOptions?.();
	if (dataCollection && state.userInfo === true) {
		dataCollection.userInfo = state.piiAllowed;
	}
	const settings = client.getSdkMetadata?.()?.sdk?.settings;
	if (settings && state.inferIp !== undefined && state.inferIp !== 'never') {
		settings.infer_ip = state.piiAllowed ? state.inferIp : 'never';
	}
};

const waitForPaint = (): Promise<void> =>
	new Promise((resolve) => {
		if (
			typeof PerformanceObserver === 'undefined' ||
			!PerformanceObserver.supportedEntryTypes?.includes('paint')
		) {
			resolve();
			return;
		}
		const observer = new PerformanceObserver((list, self) => {
			if (list.getEntriesByName('first-contentful-paint').length > 0) {
				self.disconnect();
				resolve();
			}
		});
		observer.observe({ buffered: true, type: 'paint' });
		setTimeout(() => {
			observer.disconnect();
			resolve();
		}, paintTimeoutMs);
	});

const waitForLoad = (): Promise<void> =>
	new Promise((resolve) => {
		if (document.readyState === 'complete') {
			resolve();
			return;
		}
		window.addEventListener(
			'load',
			() => {
				resolve();
			},
			{ once: true }
		);
	});

const waitForIdle = (): Promise<void> =>
	new Promise((resolve) => {
		if (typeof requestIdleCallback === 'function') {
			requestIdleCallback(
				() => {
					resolve();
				},
				{ timeout: idleTimeoutMs }
			);
			return;
		}
		setTimeout(resolve, 1);
	});

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

const loadScriptElement = (src: string, integrity?: string): Promise<void> =>
	new Promise((resolve, reject) => {
		const element = document.createElement('script');
		element.src = src;
		element.async = true;
		element.setAttribute('crossorigin', 'anonymous');
		if (integrity) {
			element.setAttribute('integrity', integrity);
		}
		element.addEventListener('load', () => {
			resolve();
		});
		element.addEventListener('error', () => {
			reject(new Error(`Could not load ${src}`));
		});
		document.head.append(element);
	});

/**
 * Applies consent to a Sentry client: error monitoring, Session Replay and
 * user data. Shared by the CDN and SDK modes.
 */
const createGate = (options: GateOptions) => {
	let latest: Permissions | undefined;
	let disposed = false;
	// Replay starts on a transition to allowed. Every transition increments
	// the revision, which cancels a start still waiting on the page or load.
	let revision = 0;
	let replayWanted: boolean | undefined;
	let piiWanted: boolean | undefined;
	let retryScheduled = false;
	let paint: Promise<void> | undefined;
	let load: Promise<void> | undefined;

	const report = (error: unknown): void => {
		try {
			if (options.onError) {
				options.onError(error);
				return;
			}
			options
				.getClient()
				?.captureException(error, { captureContext: { tags: errorTags } });
		} catch {
			// A Sentry failure must never break the consent change.
		}
	};

	const settle = async (pending: Promise<void>): Promise<void> => {
		try {
			await pending;
		} catch (error) {
			report(error);
		}
	};

	/** Resolve after first paint, page load and an idle period. */
	const whenPageReady = async (isCurrent: () => boolean): Promise<boolean> => {
		paint ??= waitForPaint();
		await paint;
		if (!isCurrent()) {
			return false;
		}
		load ??= waitForLoad();
		await load;
		if (!isCurrent()) {
			return false;
		}
		await waitForIdle();
		return isCurrent();
	};

	/** Wait a while for Sentry.init when c15t starts first. */
	const waitForClient = async (
		isCurrent: () => boolean,
		attempt = 0
	): Promise<SentryClient | undefined> => {
		const client = options.getClient();
		const delay = clientRetryDelaysMs[attempt];
		if (client || delay === undefined || !isCurrent()) {
			return isCurrent() ? client : undefined;
		}
		await sleep(delay);
		return waitForClient(isCurrent, attempt + 1);
	};

	const getState = (client: SentryClient): ClientState => {
		const known = clientStates.get(client);
		if (known) {
			return known;
		}
		const state: ClientState = {
			enabled: client.getOptions().enabled !== false,
			inferIp: client.getSdkMetadata?.()?.sdk?.settings?.infer_ip,
			piiAllowed: false,
			userInfo: client.getDataCollectionOptions?.()?.userInfo,
		};
		clientStates.set(client, state);
		client.addEventProcessor((event) => {
			if (!state.piiAllowed && event.user !== undefined) {
				event.user = undefined;
			}
			return event;
		});
		// Runs after Sentry's own hook, which adds `{{auto}}` IP inference.
		client.on?.('beforeSendSession', (session) => {
			if (state.piiAllowed) {
				return;
			}
			session.did = undefined;
			session.ipAddress = undefined;
			if (session.attrs) {
				session.attrs.ip_address = undefined;
			}
		});
		if (
			!options.startsSentry &&
			state.userInfo === true &&
			!has(options.piiCategory, ALL_DENIED)
		) {
			// Sentry sends its first session once the page is idle. When the
			// app starts Sentry first, this hook can be too late for it.
			warn(
				'Sentry.init ran before c15t, so its first session can infer the visitor IP address before consent. Pass init to sentry(), or set dataCollection: { userInfo: false } in Sentry.init.'
			);
		}
		const existing = findReplay(client);
		if (existing) {
			// Replay passed to Sentry.init has already sampled and may be
			// recording. Keep its decision so a re-grant can restore it.
			state.mode = existing.getRecordingMode() ?? null;
			warn(
				'Sentry Replay was added in Sentry.init, so it loads and may record before consent. Remove replayIntegration() from Sentry.init and let sentry() load Replay instead.'
			);
		}
		return state;
	};

	/** Sentry sends nothing without a DSN or with `enabled: false`. */
	const isClientEnabled = (client: SentryClient, state: ClientState) =>
		state.enabled && Boolean(client.getDsn());

	const stopReplay = (client: SentryClient, state: ClientState): void => {
		const replay = findReplay(client);
		try {
			if (replay) {
				// stop() turns recording off before it returns. flush: false
				// keeps the pending segment from being sent after withdrawal.
				state.stopping = settle(replay.stop({ flush: false }));
			}
		} catch (error) {
			report(error);
		}
		forgetReplaySession();
	};

	/** Apply the latest permissions to the client, if there is one yet. */
	const sync = (): SentryClient | undefined => {
		const client = options.getClient();
		if (!client || !latest) {
			return client;
		}
		const state = getState(client);
		state.piiAllowed = latest.pii;
		applyPii(client, state);
		if (options.errorsGated) {
			// The client checks this before it sends any envelope.
			client.getOptions().enabled = state.enabled && latest.errors;
		}
		if (!latest.replay) {
			stopReplay(client, state);
		}
		return client;
	};

	// Consent can arrive before Sentry.init. Apply it once a client exists.
	const retrySync = async (): Promise<void> => {
		if (retryScheduled) {
			return;
		}
		retryScheduled = true;
		const client = await waitForClient(() => !disposed);
		retryScheduled = false;
		if (client) {
			sync();
		}
	};

	const start = async (): Promise<void> => {
		if (!options.start) {
			return;
		}
		let pending = starts.get(options.getClient);
		if (!pending) {
			pending = options.start();
			starts.set(options.getClient, pending);
		}
		try {
			await pending;
		} catch (error) {
			// Let a later grant try again.
			starts.delete(options.getClient);
			throw error;
		}
		if (!disposed) {
			sync();
		}
	};

	const startReplay = async (startRevision: number): Promise<void> => {
		const isCurrent = () => !disposed && startRevision === revision;
		// The recorder snapshots the whole DOM, so start after the page settles.
		if (!(await whenPageReady(isCurrent))) {
			return;
		}
		const client = await waitForClient(isCurrent);
		if (!isCurrent()) {
			return;
		}
		if (!client) {
			// Let the next consent change try again.
			replayWanted = undefined;
			return;
		}
		const state = getState(client);
		if (!isClientEnabled(client, state)) {
			return;
		}
		await state.stopping;
		if (!isCurrent()) {
			return;
		}
		const existing = findReplay(client);
		if (existing) {
			// start() and startBuffering() ignore the sample rates, so restore
			// the decision Replay made when it was added.
			if (state.mode === 'session') {
				existing.start();
			} else if (state.mode === 'buffer') {
				existing.startBuffering();
			}
			return;
		}
		const { loadReplay } = options;
		if (!loadReplay) {
			return;
		}
		// An async wrapper turns a synchronous throw into a rejection.
		state.loading ??= (async () => await loadReplay())();
		let replay: SentryReplay;
		try {
			replay = await state.loading;
			// Sentry CDN bundles without Replay expose a placeholder
			// replayIntegration(). Adding it would block the real one.
			if (!isReplay(replay)) {
				throw new Error(
					'replay.load() did not return a Sentry Replay integration. Sentry CDN bundles without Replay return a placeholder; load replay.min.js first.'
				);
			}
		} catch (error) {
			// Let a later grant retry, for example after a failed chunk download.
			state.loading = undefined;
			throw error;
		}
		if (!isCurrent() || findReplay(client)) {
			return;
		}
		client.addIntegration(replay);
		// Sampling runs synchronously while the integration is added.
		state.mode = replay.getRecordingMode() ?? null;
	};

	const update = (info: ScriptCallbackInfo): void => {
		// A visitor who turned this vendor off gets every optional category
		// denied, whatever the category state.
		const consents =
			info.vendor?.granted === false ? ALL_DENIED : info.consents;
		const errors = !options.errorsGated || has(errorsCategory, consents);
		latest = {
			errors,
			pii: has(options.piiCategory, consents),
			// Replay sends its own requests, so it also needs Sentry to run.
			replay: errors && has(options.replayCategory, consents),
		};
		if (typeof document === 'undefined') {
			return;
		}
		if (errors && options.start) {
			void settle(start());
		}
		if (!sync()) {
			void retrySync();
		}
		const { setUser } = options;
		if (setUser && latest.pii !== piiWanted) {
			piiWanted = latest.pii;
			try {
				const user = latest.pii ? options.user?.() : null;
				if (user !== undefined) {
					setUser(user);
				}
			} catch (error) {
				report(error);
			}
		}
		if (latest.replay !== replayWanted) {
			replayWanted = latest.replay;
			revision += 1;
			if (latest.replay) {
				void settle(startReplay(revision));
			}
		}
	};

	const dispose = (): void => {
		disposed = true;
		latest = undefined;
	};

	return { dispose, report, update };
};

/**
 * Loads the Sentry browser SDK from Sentry's CDN.
 *
 * The `sentry()` helper adds `Sentry.init` and the consent handling.
 */
export const sentryManifest = {
	...vendorManifestContract,
	alwaysLoad: true,
	category: 'necessary',
	install: [
		{
			async: true,
			attributes: {
				crossorigin: 'anonymous',
				integrity: '{{integrity}}',
			},
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'sentry',
} as const satisfies VendorManifest;

const hasPositiveRate = (value: unknown): boolean =>
	typeof value === 'number' && value > 0;

type IntegrationsOption =
	| unknown[]
	| ((defaults: unknown[]) => unknown[])
	| undefined;

const isNamed = (value: unknown, name: string): boolean =>
	typeof value === 'object' &&
	value !== null &&
	'name' in value &&
	value.name === name;

/** Build the `Sentry.init` options for the CDN bundle. */
const createInitOptions = (
	sentryGlobal: SentryGlobal,
	dsn: string,
	initOptions: Record<string, unknown>,
	tracing: boolean
): Record<string, unknown> => {
	const integrations = initOptions.integrations as IntegrationsOption;
	return {
		...initOptions,
		dsn,
		// Like Sentry's Loader Script, add tracing when the bundle has it.
		integrations: (defaults: unknown[]) => {
			let list: unknown[];
			if (typeof integrations === 'function') {
				list = integrations(defaults);
			} else {
				list = [...defaults, ...(integrations ?? [])];
			}
			if (
				tracing &&
				sentryGlobal.browserTracingIntegration &&
				!list.some((integration) => isNamed(integration, tracingName))
			) {
				list.push(sentryGlobal.browserTracingIntegration());
			}
			return list;
		},
	};
};

const getCategory = (
	options: SentryOptions,
	replayCategory: HasCondition<AllConsentNames>,
	piiCategory: HasCondition<AllConsentNames>
): HasCondition<AllConsentNames> => {
	const afterConsent = options.loadMode === 'after-consent';
	// The loader registers the categories a script names. Naming the feature
	// categories here lets c15t offer them; `necessary` keeps it always true.
	const features: HasCondition<AllConsentNames> = {
		or: [
			...new Set<HasCondition<AllConsentNames>>([
				'necessary',
				...(afterConsent ? [errorsCategory] : []),
				replayCategory,
				piiCategory,
			]),
		],
	};
	// Sentry from the CDN loads only once error monitoring may run.
	if (afterConsent && options.dsn !== undefined) {
		return { and: [errorsCategory, features] };
	}
	return features;
};

const createCdnScript = (
	options: SentryCdnOptions,
	category: HasCondition<AllConsentNames>,
	gateOptions: Omit<GateOptions, 'getClient' | 'setUser' | 'startsSentry'>
): Script => {
	const dsn = requireId('sentry', 'dsn', options.dsn);
	const version = trimToUndefined(options.version) ?? defaultVersion;
	const initOptions = options.initOptions ?? {};
	const tracing =
		options.tracing ??
		(initOptions.tracesSampleRate !== undefined ||
			initOptions.tracesSampler !== undefined);
	const bundle = tracing ? tracingBundle : errorsBundle;
	const integrityFor = (file: string): string | undefined =>
		version === defaultVersion ? defaultIntegrity[file] : undefined;
	const replayAllowed =
		options.replay !== false &&
		(hasPositiveRate(initOptions.replaysSessionSampleRate) ||
			hasPositiveRate(initOptions.replaysOnErrorSampleRate));
	const replayOptions =
		options.replay === false ? undefined : options.replay?.options;

	const gate = createGate({
		...gateOptions,
		getClient: () => getSentryGlobal()?.getClient(),
		loadReplay: replayAllowed
			? async () => {
					await loadScriptElement(
						`${cdnBaseUrl}/${version}/${replayBundle}`,
						integrityFor(replayBundle)
					);
					return getSentryGlobal()?.replayIntegration?.(
						replayOptions
					) as SentryReplay;
				}
			: undefined,
		setUser: (user) => {
			getSentryGlobal()?.setUser(user);
		},
		startsSentry: true,
	});

	const resolved = resolveManifest(sentryManifest, {
		integrity: integrityFor(bundle),
		scriptUrl: `${cdnBaseUrl}/${version}/${bundle}`,
	});

	return {
		...resolved,
		alwaysLoad: options.loadMode === 'after-consent' ? undefined : true,
		category,
		onConsentChange: gate.update,
		onDispose: gate.dispose,
		onLoad: (info) => {
			const sentryGlobal = getSentryGlobal();
			try {
				// The script loads again after a re-grant without a reload. The
				// bundle reuses the running client, so initialize only once.
				if (sentryGlobal && !sentryGlobal.getClient()) {
					sentryGlobal.init(
						createInitOptions(sentryGlobal, dsn, initOptions, tracing)
					);
				}
			} catch (error) {
				gate.report(error);
			}
			gate.update(info);
		},
	};
};

/**
 * Run Sentry with c15t consent: error monitoring, Session Replay and user
 * data.
 *
 * Pass `dsn` and c15t loads Sentry from Sentry's CDN, pinned and with
 * subresource integrity, then calls `Sentry.init`. Pass `getClient` instead
 * when your app runs the Sentry SDK itself.
 *
 * Error monitoring runs for every visitor unless `loadMode` is
 * `after-consent`. Replay loads and records only once its permission is
 * allowed, and stops on withdrawal. While user data is not allowed, events
 * and sessions carry no user and Sentry infers no IP address.
 *
 * The script's vendor slug is `sentry`; while a visitor has that vendor
 * turned off, Replay and user data are treated as denied, as is error
 * monitoring with `loadMode: 'after-consent'`.
 *
 * @param options - A DSN for c15t to load Sentry, or your Sentry SDK functions.
 * @returns A script for the c15t script loader.
 * @throws {Error} If `dsn` is empty, `pii.user` is set without `setUser`, or
 *   `loadMode: 'after-consent'` is set with `getClient` but without `init`.
 * @example
 * ```ts
 * sentry({
 * 	dsn: 'https://your-key@o0.ingest.sentry.io/0',
 * 	initOptions: {
 * 		replaysSessionSampleRate: 0.1,
 * 		replaysOnErrorSampleRate: 1,
 * 	},
 * });
 * ```
 * @example
 * ```ts
 * import { getClient, setUser } from '@sentry/browser';
 *
 * sentry({
 * 	getClient,
 * 	setUser,
 * 	replay: {
 * 		load: () => import('./sentry-replay').then((m) => m.createReplay()),
 * 	},
 * });
 * ```
 */
export const sentry = (options: SentryOptions): Script => {
	const replayCategory =
		(options.replay ? options.replay.category : undefined) ?? defaultCategory;
	const piiCategory = options.pii?.category ?? defaultCategory;
	const category = getCategory(options, replayCategory, piiCategory);
	const errorsGated = options.loadMode === 'after-consent';
	const gateOptions = {
		errorsGated,
		onError: options.onError,
		piiCategory,
		replayCategory,
		user: options.pii?.user,
	};

	if (options.dsn !== undefined) {
		return createCdnScript(options, category, gateOptions);
	}

	if (options.pii?.user && !options.setUser) {
		throw new Error('sentry: pass setUser with pii.user');
	}
	if (errorsGated && !options.init) {
		throw new Error(
			"sentry: pass init with loadMode 'after-consent', so c15t can start Sentry after consent"
		);
	}
	const { init } = options;
	const gate = createGate({
		...gateOptions,
		getClient: options.getClient,
		loadReplay: options.replay?.load,
		setUser: options.setUser,
		start: init
			? async () => {
					if (!options.getClient()) {
						await init();
					}
				}
			: undefined,
		startsSentry: init !== undefined,
	});

	return {
		alwaysLoad: true,
		callbackOnly: true,
		category,
		id: scriptId,
		// Each feature checks its own condition, so the removal call, which
		// reports hasConsent: false with unchanged consents, changes nothing.
		onConsentChange: gate.update,
		onDispose: gate.dispose,
		onLoad: gate.update,
		// Like the manifest helpers, the script ID doubles as the vendor slug,
		// so visitors can turn Sentry off inside a granted category.
		vendor: scriptId,
	};
};
