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
import {
	waitForReplayIdle,
	waitForReplayLoad,
	waitForReplayPaint,
} from '../_shared/replay-scheduler';
import { requireId } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
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

/** Envelope items passed to Sentry's final send hook. */
export type SentryEnvelope = readonly [
	unknown,
	(readonly [{ type: string }, unknown])[],
];

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
	/** Preserve app-initiated shutdowns separately from consent denial. */
	close?: (timeout?: number) => PromiseLike<boolean>;
	getDataCollectionOptions?: () => { userInfo?: boolean };
	getDsn: () => unknown;
	getIntegrationByName: (name: string) => unknown;
	getOptions: () => { enabled?: boolean };
	getSdkMetadata?: () =>
		| { sdk?: { settings?: { infer_ip?: string } } }
		| undefined;
	on: {
		(
			hook: 'beforeSendSession',
			callback: (session: SentrySession) => void
		): unknown;
		(
			hook: 'beforeEnvelope',
			callback: (envelope: SentryEnvelope) => void
		): unknown;
	};
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
	/** Last enabled value written or observed by the adapter. */
	lastEnabled: boolean;
	/** Current adapter instance, including replacements on the same client. */
	owner: object;
	/** Whether events may carry user data. Read by the event processor. */
	piiAllowed: boolean;
	/** Whether Replay envelopes may leave the browser. */
	replayAllowed: boolean;
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
	stopFailed?: boolean;
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
/** Retry until a late-initialized SDK client appears or the adapter is removed. */
const clientRetryMs = 100;
const errorTags = { 'c15t.integration': 'sentry' };
/** Initial permissions used to decide whether early IP inference needs a warning. */
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Strip SDK user attributes without changing unrelated telemetry fields. */
const redactUserAttributes = (payload: unknown): void => {
	if (!isRecord(payload)) {
		return;
	}
	for (const field of ['attributes', 'data']) {
		const attributes = payload[field];
		if (!isRecord(attributes)) {
			continue;
		}
		for (const key of Object.keys(attributes)) {
			if (key.startsWith('user.') || key.startsWith('sentry.user.')) {
				Reflect.deleteProperty(attributes, key);
			}
		}
	}
};

/** Final redaction also catches users added by scope processors or beforeSend. */
const redactEnvelope = (envelope: SentryEnvelope): void => {
	for (const [header, payload] of envelope[1]) {
		if (!isRecord(payload)) {
			continue;
		}
		switch (header.type) {
			case 'event':
			case 'transaction':
			case 'replay_event':
			case 'feedback':
				delete payload.user;
				if (isRecord(payload.contexts)) {
					redactUserAttributes(payload.contexts.trace);
				}
				if (Array.isArray(payload.spans)) {
					for (const span of payload.spans) {
						redactUserAttributes(span);
					}
				}
				break;
			case 'session':
				delete payload.did;
				if (isRecord(payload.attrs)) {
					delete payload.attrs.ip_address;
				}
				break;
			case 'log':
			case 'trace_metric':
			case 'span':
				redactUserAttributes(payload);
				if (Array.isArray(payload.items)) {
					for (const item of payload.items) {
						redactUserAttributes(item);
					}
				}
				if (isRecord(payload.ingest_settings)) {
					payload.ingest_settings.infer_ip = 'never';
				}
				break;
			default:
				break;
		}
	}
};

/** Share consent and Replay lifecycle handling between SDK and CDN modes. */
const createGate = (options: GateOptions) => {
	let latest: Permissions | undefined;
	let disposed = false;
	let revision = 0;
	let replayWanted: boolean | undefined;
	let piiWanted: boolean | undefined;
	let clientTimer: ReturnType<typeof setTimeout> | undefined;
	let pendingReplay: AbortController | undefined;
	const owner = {};

	const report = (error: unknown): void => {
		try {
			if (options.onError) {
				options.onError(error);
			} else {
				options
					.getClient()
					?.captureException(error, { captureContext: { tags: errorTags } });
			}
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

	const getState = (client: SentryClient): ClientState => {
		const known = clientStates.get(client);
		if (known) {
			known.owner = owner;
			return known;
		}
		const state: ClientState = {
			enabled: client.getOptions().enabled !== false,
			inferIp: client.getSdkMetadata?.()?.sdk?.settings?.infer_ip,
			lastEnabled: client.getOptions().enabled !== false,
			owner,
			piiAllowed: false,
			replayAllowed: false,
			userInfo: client.getDataCollectionOptions?.()?.userInfo,
		};
		clientStates.set(client, state);
		client.addEventProcessor((event) => {
			if (!state.piiAllowed) {
				delete event.user;
			}
			return event;
		});
		client.on('beforeEnvelope', (envelope) => {
			// stop({ flush: false }) discards the pending segment in supported
			// SDKs. Also block uploads already queued before denial or removal.
			if (!state.replayAllowed || state.stopping) {
				for (let index = envelope[1].length - 1; index >= 0; index -= 1) {
					const type = envelope[1][index]?.[0].type;
					if (type === 'replay_event' || type === 'replay_recording') {
						envelope[1].splice(index, 1);
					}
				}
			}
			if (!state.piiAllowed) {
				redactEnvelope(envelope);
			}
		});
		client.on('beforeSendSession', (session) => {
			if (state.piiAllowed) {
				return;
			}
			session.did = undefined;
			session.ipAddress = undefined;
			if (session.attrs) {
				session.attrs.ip_address = undefined;
			}
		});
		// close() can happen while consent already has enabled=false. The
		// option alone cannot distinguish that shutdown from our own denial.
		const { close } = client;
		if (close) {
			client.close = (timeout) => {
				state.enabled = false;
				return close.call(client, timeout);
			};
		}
		if (
			!options.startsSentry &&
			state.userInfo === true &&
			!has(options.piiCategory, ALL_DENIED)
		) {
			warn(
				'Sentry.init ran before c15t, so its first session can infer the visitor IP address before consent. Pass init to sentry(), or set dataCollection: { userInfo: false } in Sentry.init.'
			);
		}
		const existing = findReplay(client);
		if (existing) {
			state.mode = existing.getRecordingMode() ?? null;
			warn(
				'Sentry Replay was added in Sentry.init, so it loads and may record before consent. Remove replayIntegration() from Sentry.init and let sentry() load Replay instead.'
			);
		}
		return state;
	};

	const isClientEnabled = (client: SentryClient, state: ClientState): boolean =>
		state.enabled &&
		client.getOptions().enabled !== false &&
		Boolean(client.getDsn());

	const stopReplay = (client: SentryClient, state: ClientState): void => {
		const replay = findReplay(client);
		try {
			if (replay && !state.stopping) {
				// Recording stops synchronously before the promise is returned.
				const pending = replay.stop({ flush: false });
				state.stopping = (async () => {
					try {
						await pending;
						state.stopFailed = false;
					} catch (error) {
						state.stopFailed = true;
						report(error);
					} finally {
						state.stopping = undefined;
					}
				})();
			}
		} catch (error) {
			state.stopFailed = true;
			report(error);
		} finally {
			forgetReplaySession();
		}
	};

	const sync = (): SentryClient | undefined => {
		if (disposed || !latest) {
			return;
		}
		const client = options.getClient();
		if (!client) {
			return;
		}
		const state = getState(client);
		const clientOptions = client.getOptions();
		const enabled = clientOptions.enabled !== false;
		// Preserve changes the app makes while Sentry is running.
		if (enabled !== state.lastEnabled) {
			state.enabled = enabled;
		}
		clientOptions.enabled = state.enabled && latest.errors;
		state.lastEnabled = clientOptions.enabled !== false;
		state.piiAllowed = latest.pii;
		state.replayAllowed = latest.replay && isClientEnabled(client, state);
		applyPii(client, state);
		if (!latest.replay || !isClientEnabled(client, state)) {
			stopReplay(client, state);
		}
		if (options.setUser && latest.pii !== piiWanted) {
			piiWanted = latest.pii;
			try {
				const user = latest.pii ? options.user?.() : null;
				if (user !== undefined) {
					options.setUser(user);
				}
			} catch (error) {
				report(error);
			}
		}
		return client;
	};

	const loadReplay = async (
		state: ClientState
	): Promise<SentryReplay | undefined> => {
		const { loadReplay: loadIntegration } = options;
		if (!loadIntegration) {
			return;
		}
		state.loading ??= (async () => await loadIntegration())();
		try {
			const replay = await state.loading;
			if (!isReplay(replay)) {
				throw new Error(
					'replay.load() did not return a Sentry Replay integration. Sentry CDN bundles without Replay return a placeholder; load replay.min.js first.'
				);
			}
			return replay;
		} catch (error) {
			state.loading = undefined;
			throw error;
		}
	};

	const resumeReplay = async (
		replay: SentryReplay,
		state: ClientState,
		signal: AbortSignal,
		allowed: () => boolean
	): Promise<void> => {
		if (replay.getRecordingMode() !== undefined) {
			return;
		}
		if (!(await waitForReplayIdle(signal)) || !allowed()) {
			return;
		}
		if (state.mode === 'session') {
			replay.start();
		} else if (state.mode === 'buffer') {
			replay.startBuffering();
		}
	};

	const startReplay = async (
		startRevision: number,
		signal: AbortSignal
	): Promise<void> => {
		const isCurrent = () =>
			!signal.aborted &&
			!disposed &&
			latest?.replay === true &&
			startRevision === revision;
		if (!(await waitForReplayPaint(signal)) || !isCurrent()) {
			return;
		}
		if (!(await waitForReplayLoad(signal)) || !isCurrent()) {
			return;
		}
		const client = sync();
		if (!client || !isCurrent()) {
			return;
		}
		const state = getState(client);
		const allowed = () =>
			isCurrent() &&
			state.owner === owner &&
			options.getClient() === client &&
			isClientEnabled(client, state);
		if (!allowed()) {
			return;
		}
		await state.stopping;
		if (!allowed() || state.stopFailed) {
			return;
		}
		const existing = findReplay(client);
		if (existing) {
			await resumeReplay(existing, state, signal, allowed);
			return;
		}
		const replay = await loadReplay(state);
		if (!replay) {
			return;
		}
		if (!allowed()) {
			return;
		}
		if (
			!(await waitForReplayIdle(signal)) ||
			!allowed() ||
			findReplay(client)
		) {
			return;
		}
		client.addIntegration(replay);
		state.mode = replay.getRecordingMode() ?? null;
		if (!allowed()) {
			stopReplay(client, state);
		}
	};

	const queueReplay = (): void => {
		if (pendingReplay || disposed || !latest?.replay) {
			return;
		}
		const controller = new AbortController();
		pendingReplay = controller;
		void (async () => {
			try {
				await startReplay(revision, controller.signal);
			} catch (error) {
				report(error);
			} finally {
				if (pendingReplay === controller) {
					pendingReplay = undefined;
				}
			}
		})();
	};

	// Keep the latest permission even when Sentry initializes much later.
	// Only one short retry timer runs, and removal cancels it.
	const retrySync = (): void => {
		if (clientTimer !== undefined || disposed) {
			return;
		}
		clientTimer = setTimeout(() => {
			clientTimer = undefined;
			try {
				if (sync()) {
					queueReplay();
				} else {
					retrySync();
				}
			} catch (error) {
				report(error);
			}
		}, clientRetryMs);
	};

	const denyClient = (): void => {
		try {
			const client = options.getClient();
			if (!client) {
				return;
			}
			const existing = clientStates.get(client);
			if (existing && existing.owner !== owner) {
				return;
			}
			const state = existing ?? getState(client);
			state.piiAllowed = false;
			state.replayAllowed = false;
			applyPii(client, state);
			if (options.errorsGated) {
				client.getOptions().enabled = false;
				state.lastEnabled = false;
			}
			stopReplay(client, state);
			options.setUser?.(null);
		} catch (error) {
			report(error);
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
			starts.delete(options.getClient);
			throw error;
		}
		if (disposed) {
			denyClient();
		} else if (sync()) {
			queueReplay();
		}
	};

	const update = (info: ScriptCallbackInfo): void => {
		if (disposed) {
			return;
		}
		// Vendor denial overrides every feature condition, including necessary.
		const vendorAllowed = info.vendor?.granted !== false;
		const errors =
			!options.errorsGated ||
			(vendorAllowed && has(errorsCategory, info.consents));
		latest = {
			errors,
			pii: vendorAllowed && has(options.piiCategory, info.consents),
			replay:
				vendorAllowed && errors && has(options.replayCategory, info.consents),
		};
		if (typeof document === 'undefined') {
			return;
		}
		if (latest.replay !== replayWanted) {
			replayWanted = latest.replay;
			revision += 1;
			pendingReplay?.abort();
			pendingReplay = undefined;
		}
		if (errors && options.start) {
			void settle(start());
		}
		try {
			if (!sync()) {
				retrySync();
			}
			queueReplay();
		} catch (error) {
			report(error);
		}
	};

	const dispose = (): void => {
		if (disposed) {
			return;
		}
		disposed = true;
		revision += 1;
		pendingReplay?.abort();
		pendingReplay = undefined;
		clearTimeout(clientTimer);
		clientTimer = undefined;
		latest = undefined;
		denyClient();
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

/** Build the SDK or CDN script and its consent gate. */
const createSentryScript = (options: SentryOptions): Script => {
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
		onBeforeLoad: gate.update,
		onConsentChange: gate.update,
		onDispose: gate.dispose,
		onLoad: gate.update,
		// Like the manifest helpers, the script ID doubles as the vendor slug,
		// so visitors can turn Sentry off inside a granted category.
		vendor: scriptId,
	};
};

const reuseSentryScript = createScriptReuse<SentryOptions>();

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
 * Equal configurations reuse the mounted script without interrupting Replay.
 * Keep callback functions stable when recreating the options object.
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
export const sentry = (options: SentryOptions): Script =>
	reuseSentryScript(options, createSentryScript);
