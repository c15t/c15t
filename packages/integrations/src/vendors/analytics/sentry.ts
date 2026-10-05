import type {
	AllConsentNames,
	ConsentState,
	HasCondition,
	Script,
	ScriptCallbackInfo,
} from '@c15t/core';
import { has } from '@c15t/core';

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
}

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

export interface SentryPiiOptions {
	/**
	 * Permission Sentry needs before events carry user data.
	 * @default 'measurement'
	 */
	category?: HasCondition<AllConsentNames>;
	/** Returns the user to pass to `setUser` when the permission is allowed. */
	user?: () => SentryUser | null | undefined;
}

export interface SentryOptions {
	/**
	 * Returns the app's Sentry client. Pass `getClient` from your Sentry SDK.
	 * It is read on every consent change, so the adapter also works when
	 * c15t starts before `Sentry.init`.
	 */
	getClient: () => SentryClient | undefined;
	/**
	 * `setUser` from your Sentry SDK. Called with `null` while personal data
	 * is not allowed, and with `pii.user()` when it becomes allowed.
	 */
	setUser?: (user: SentryUser | null) => void;
	/** Gate Session Replay. Without it, the adapter only stops a Replay the app added itself. */
	replay?: SentryReplayOptions;
	/** Gate user data on events. */
	pii?: SentryPiiOptions;
	/**
	 * Receives Replay load, start and stop failures. Without it, the adapter
	 * reports them to Sentry with the tag `c15t.integration: sentry`.
	 */
	onError?: (error: unknown) => void;
}

interface Permissions {
	pii: boolean;
	replay: boolean;
}

interface ClientState {
	/** Whether events may carry user data. Read by the event processor. */
	piiAllowed: boolean;
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

const scriptId = 'sentry';
const replayName = 'Replay';
/** sessionStorage key where Sentry Replay keeps its session. */
const replaySessionKey = 'sentryReplaySession';
const defaultCategory = 'measurement';
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

// Sentry allows one Replay per page, and an app can recreate this script on
// every render, so Replay bookkeeping lives with the client, not the adapter.
const clientStates = new WeakMap<SentryClient, ClientState>();

const isProduction = (): boolean =>
	(globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
		?.NODE_ENV === 'production';

const warn = (message: string): void => {
	if (!isProduction()) {
		console.warn(`[c15t] ${message}`);
	}
};

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

/** Sentry sends nothing without a DSN or with `enabled: false`. */
const isClientEnabled = (client: SentryClient): boolean =>
	client.getOptions().enabled !== false && Boolean(client.getDsn());

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

/**
 * Let c15t's Sentry setup gate Session Replay and user data by consent.
 *
 * Does not load or initialize Sentry. Call `Sentry.init` in your own code,
 * without `replayIntegration()`, and set the Replay sample rates there. Error
 * monitoring runs for every visitor. Replay loads, records and stops with its
 * permission, and events drop user data while theirs is missing. Removing
 * the script does not stop Replay.
 *
 * The script's vendor slug is `sentry`; while a visitor has that vendor
 * turned off, Replay and user data are treated as denied.
 *
 * @param options - Your Sentry SDK functions and the features to gate.
 * @returns A callback-only script for the c15t script loader.
 * @throws {Error} If `pii.user` is set without `setUser`.
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
	if (options.pii?.user && !options.setUser) {
		throw new Error('Pass setUser with pii.user so the adapter can set it.');
	}
	const replayCategory = options.replay?.category ?? defaultCategory;
	const piiCategory = options.pii?.category ?? defaultCategory;

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
			// A Replay failure must never break the consent change.
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
		const state: ClientState = { piiAllowed: false };
		clientStates.set(client, state);
		client.addEventProcessor((event) => {
			if (!state.piiAllowed && event.user !== undefined) {
				event.user = undefined;
			}
			return event;
		});
		if (
			client.getDataCollectionOptions?.().userInfo === true &&
			!has(piiCategory, ALL_DENIED)
		) {
			warn(
				'Sentry has dataCollection.userInfo enabled, so it infers visitor IP addresses before consent. Set dataCollection: { userInfo: false } in Sentry.init.'
			);
		}
		const existing = findReplay(client);
		if (existing) {
			// Replay passed to Sentry.init has already sampled and may be
			// recording. Keep its decision so a re-grant can restore it.
			state.mode = existing.getRecordingMode() ?? null;
			warn(
				'Sentry Replay was added in Sentry.init, so it loads and may record before consent. Remove replayIntegration() from Sentry.init and pass replay.load to sentry() instead.'
			);
		}
		return state;
	};

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
		const isCurrent = () => !disposed;
		const client =
			(await whenPageReady(isCurrent)) && (await waitForClient(isCurrent));
		retryScheduled = false;
		if (client) {
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
		if (!isClientEnabled(client)) {
			return;
		}
		const state = getState(client);
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
		if (!options.replay) {
			return;
		}
		const { load: loadReplay } = options.replay;
		// An async wrapper turns a synchronous throw into a rejection.
		state.loading ??= (async () => await loadReplay())();
		let replay: SentryReplay;
		try {
			replay = await state.loading;
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
		latest = {
			pii: has(piiCategory, consents),
			replay: has(replayCategory, consents),
		};
		if (typeof document === 'undefined') {
			return;
		}
		if (!sync()) {
			void retrySync();
		}
		if (options.setUser && latest.pii !== piiWanted) {
			piiWanted = latest.pii;
			try {
				const user = latest.pii ? options.pii?.user?.() : null;
				if (user !== undefined) {
					options.setUser(user);
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

	// The loader registers the categories a script names. Naming the feature
	// categories here lets c15t offer them; `necessary` keeps it always true.
	const category: HasCondition<AllConsentNames> = {
		or: [
			...new Set<HasCondition<AllConsentNames>>([
				'necessary',
				replayCategory,
				piiCategory,
			]),
		],
	};

	return {
		alwaysLoad: true,
		callbackOnly: true,
		category,
		id: scriptId,
		// Each feature checks its own condition, so the removal call, which
		// reports hasConsent: false with unchanged consents, changes nothing.
		onConsentChange: update,
		onDispose: () => {
			disposed = true;
			latest = undefined;
		},
		onLoad: update,
		// Like the manifest helpers, the script ID doubles as the vendor slug,
		// so visitors can turn Sentry off inside a granted category.
		vendor: scriptId,
	};
};
