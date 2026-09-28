/*
 * `max-classes-per-file` is waived for this whole file: the emitter, the core behind
 * the injected module, and the shell that survives a restart are one fixture, and a
 * runner should read all three without following imports. The directive has to sit
 * above the first statement to cover the file scope.
 */
/* eslint-disable max-classes-per-file */

/**
 * A fake c15t native consent core, written against the public package surface.
 *
 * The real core is Swift on iOS and Kotlin on Android, and this file is neither.
 * It is the same shape the real one has from JavaScript's point of view: a
 * `NativeC15tTurboModule` plus an event emitter, handed to the package's own
 * `createConsentClient`, so every hook, gate, and built-in surface in this app
 * runs the identical code path it runs against a device build. Nothing here is
 * imported from `packages/react-native/src`.
 *
 * What it imitates, and why:
 *
 * - `getSnapshot()` answers synchronously from the last stored envelope, so a
 *   cold start with nothing resolved still reads deny-all rather than blocking.
 * - Hydration and the first policy resolution are separate steps on a timer, so
 *   the runner can watch the cached snapshot answer before the network does.
 * - A sampler reads the effective permissions on a timer and a drift timer flips
 *   one of them, so the gating path is visible without touching a backend.
 * - Writes go to a pending queue that only drains while online, so airplane mode
 *   and the replay on the next start are both exercisable.
 *
 * It is not a consent engine. It evaluates nothing, and the numbers in its
 * snapshot are the ones this file was handed.
 */

import {
	defaultNativeOverrides,
	denyAllSnapshot,
	PROTOCOL_VERSION,
} from '@c15t/react-native';
import type {
	CommitIntent,
	CommitResult,
	ConsentSnapshot,
	NativeC15tTurboModule,
	NativeEventName,
	NativeEventsLike,
	NativeOverrides,
	NativeOverridesInput,
} from '@c15t/react-native';

/** Categories the fake core knows about, in display order. */
export const CATEGORIES = [
	'necessary',
	'functionality',
	'experience',
	'measurement',
	'marketing',
] as const;

/** One category name. */
export type Category = (typeof CATEGORIES)[number];

/** A category the subject can decide on. */
export type OptionalCategory = Exclude<Category, 'necessary'>;

/** The optional categories, in the order a preference list shows them. */
export const OPTIONAL_CATEGORIES: readonly OptionalCategory[] = [
	'functionality',
	'experience',
	'measurement',
	'marketing',
];

type FakeModel = 'none' | 'opt-in' | 'opt-out';

type Permissions = ConsentSnapshot['effectivePermissions'];
type ExplicitChoice = NonNullable<ConsentSnapshot['explicitChoice']>;
type Prompt = ConsentSnapshot['promptRequirement'];

/** EU/EEA members, enough of them to make the override button meaningful. */
const EU_COUNTRIES = new Set([
	'AT',
	'BE',
	'BG',
	'CH',
	'CY',
	'CZ',
	'DE',
	'DK',
	'EE',
	'ES',
	'FI',
	'FR',
	'GR',
	'HR',
	'HU',
	'IE',
	'IS',
	'IT',
	'LI',
	'LT',
	'LU',
	'LV',
	'MT',
	'NL',
	'NO',
	'PL',
	'PT',
	'RO',
	'SE',
	'SI',
	'SK',
]);

/** The category the drift timer moves on each tick, in order. */
const DRIFT_ORDER: readonly OptionalCategory[] = [
	'measurement',
	'marketing',
	'experience',
	'functionality',
];

const EU_POLICY_ID = 'policy-eea-opt-in';
const US_POLICY_ID = 'policy-us-opt-out';
const DEFAULT_POLICY_ID = 'policy-global-default';

/** Cap on the pending queue, matching the contract's newest-20 rule. */
const MAX_QUEUED_PAYLOADS = 20;

/** One permission reading taken by the sampler. */
export interface PermissionSample {
	/** Epoch milliseconds of the reading. */
	readonly at: number;
	/** Permission per category at that instant. */
	readonly allowed: Readonly<Permissions>;
	/** Snapshot revision the reading was taken against. */
	readonly revision: number;
}

/** One line in the on-screen log of what the fake core did. */
export interface FakeLogEntry {
	readonly at: number;
	readonly level: 'info' | 'warn';
	readonly text: string;
}

/** What survives a restart, standing in for the Keychain and encrypted store. */
interface PersistedEnvelope {
	readonly revision: number;
	readonly snapshot: ConsentSnapshot;
	readonly subjectId: string;
	readonly externalId: string | null;
	readonly granted: Readonly<Partial<Record<OptionalCategory, boolean>>>;
	readonly noticeDismissed: boolean;
	readonly queuedPayloads: readonly string[];
}

/** Timings the fake core runs on, all in milliseconds. */
export interface FakeNativeOptions {
	readonly hydrateDelayMs?: number;
	readonly initDelayMs?: number;
	readonly sampleIntervalMs?: number;
	readonly driftIntervalMs?: number;
}

/** The pair `createConsentClient` takes, plus what the fixture drives. */
export interface FakeNativeSession {
	/** Changes on every restart so React can remount the subtree. */
	readonly id: number;
	readonly module: NativeC15tTurboModule;
	readonly events: NativeEventsLike;
	/** The core behind the module, for the controls the fixture exposes. */
	readonly core: FakeCore;
}

/** Push a value to a listener immediately and on every later change. */
class Channel<ValueType> {
	private readonly listeners = new Set<(value: ValueType) => void>();
	private current: ValueType | null = null;

	public get latest(): ValueType | null {
		return this.current;
	}

	public publish(value: ValueType): void {
		this.current = value;
		for (const listener of [...this.listeners]) {
			listener(value);
		}
	}

	public subscribe(listener: (value: ValueType) => void): () => void {
		this.listeners.add(listener);
		if (this.current !== null) {
			listener(this.current);
		}

		return () => {
			this.listeners.delete(listener);
		};
	}
}

interface CoreHooks {
	/** Next category the drift timer should move. */
	readonly rotateDriftTarget: () => OptionalCategory;
}

/**
 * Apply a partial override input to the current overrides.
 *
 * A key that is absent keeps its value and a key that is present with `null`
 * clears it, which is the spelling `NativeOverridesInput` documents. A plain
 * spread would treat those two cases the same.
 */
const mergeOverrides = function mergeOverrides(
	current: NativeOverrides,
	input: NativeOverridesInput
): NativeOverrides {
	return {
		country: 'country' in input ? (input.country ?? null) : current.country,
		gpc: 'gpc' in input ? (input.gpc ?? null) : current.gpc,
		language: input.language ?? current.language,
		region: 'region' in input ? (input.region ?? null) : current.region,
	};
};

const resolveModel = (country: string | null): FakeModel => {
	if (country === null) {
		return 'none';
	}
	if (EU_COUNTRIES.has(country.toUpperCase())) {
		return 'opt-in';
	}
	return country.toUpperCase() === 'US' ? 'opt-out' : 'none';
};

const policyIdFor = (model: FakeModel): string => {
	if (model === 'opt-in') {
		return EU_POLICY_ID;
	}
	return model === 'opt-out' ? US_POLICY_ID : DEFAULT_POLICY_ID;
};

const emptyPermissions = (): Permissions => ({
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
});

/**
 * Decide what the subject is owed next.
 *
 * A recorded choice settles it. Otherwise opt-out owes a notice until that notice is
 * dismissed, and opt-in owes a decision.
 */
const promptFor = (
	hasChoice: boolean,
	model: FakeModel,
	noticeDismissed: boolean
): Prompt => {
	if (hasChoice) {
		return { kind: 'none' };
	}

	if (model === 'opt-out') {
		return noticeDismissed
			? { kind: 'none' }
			: { kind: 'notice', reason: 'missing' };
	}

	return { kind: 'choice', reason: 'missing' };
};

const decide = (
	intent: CommitIntent
): Partial<Record<OptionalCategory, boolean>> => {
	const decided: Partial<Record<OptionalCategory, boolean>> = {};
	const inScope = (category: OptionalCategory): boolean =>
		intent.categories === undefined || intent.categories.includes(category);

	for (const category of OPTIONAL_CATEGORIES) {
		if (!inScope(category)) {
			continue;
		}

		if (intent.action === 'all') {
			decided[category] = true;
		} else if (intent.action === 'necessary') {
			decided[category] = false;
		} else {
			const choice = intent.consents[category];

			if (choice !== undefined) {
				decided[category] = choice;
			}
		}
	}

	return decided;
};

const describeDecision = (
	decided: Readonly<Partial<Record<OptionalCategory, boolean>>>
): string => {
	const entries = Object.entries(decided);

	return entries.length === 0
		? 'no categories touched'
		: entries
				.map(([category, value]) => `${category}=${String(value)}`)
				.join(' ');
};

/**
 * Yield one macrotask.
 *
 * The real bridge resolves a command after the native round trip, so a caller that
 * reads the snapshot in the same turn it committed sees the old state. A fake that
 * resolves synchronously inside the microtask queue would let that caller pass here
 * and fail on a device.
 */
const settle = (): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, 0);
	});

const parseJson = <ValueType>(text: string): ValueType | null => {
	try {
		return JSON.parse(text) as ValueType;
	} catch {
		return null;
	}
};

/**
 * A random subject id, which is what the contract asks for: a c15t-owned UUID,
 * never something derived from the hardware. It is not crypto-random because
 * this is a fixture, and it is labelled so nothing mistakes it for the real one.
 */
const newSubjectId = (): string => {
	const seed = String(Date.now()).padStart(12, '0').slice(-12);

	return `f4c15000-0000-4000-8000-${seed}`;
};

/**
 * One run of the fake core.
 *
 * The module and the emitter are ordinary objects, which is exactly what the
 * bridge hands JavaScript: `createConsentClient` takes them as injected
 * arguments, so nothing in the package knows the difference.
 */
class FakeCore {
	public readonly module: NativeC15tTurboModule;
	public readonly events: NativeEventsLike;

	private readonly sdk: FakeNativeSdk;
	private readonly timings: Required<FakeNativeOptions>;
	private readonly hooks: CoreHooks;
	private readonly listeners = new Map<
		string,
		Set<(payload: string) => void>
	>();
	private readonly timerIds = new Set<ReturnType<typeof setInterval>>();

	private revision = 0;
	private snapshot: ConsentSnapshot = denyAllSnapshot(
		'fake core: nothing stored yet',
		0
	);
	private subjectId = '';
	private externalId: string | null = null;
	private granted: Partial<Record<OptionalCategory, boolean>> = {};
	private noticeDismissed = false;
	private queuedPayloads: string[] = [];
	private overrides: NativeOverrides = defaultNativeOverrides('en');
	private driftRunning = false;

	public constructor(
		sdk: FakeNativeSdk,
		timings: Required<FakeNativeOptions>,
		hooks: CoreHooks
	) {
		this.sdk = sdk;
		this.timings = timings;
		this.hooks = hooks;

		this.module = {
			addListener: () => {
				// The emitter is in JavaScript here, so there is nothing to enable
				// natively. The real module uses this to start and stop emitting.
			},
			commit: (intent) => this.commit(intent),
			dismissNotice: () => {
				this.dismissNotice();
			},
			getBootstrap: () => this.bootstrap(),
			getSnapshot: () => this.getSnapshot(),
			getTrackingAuthorization: () =>
				// The fake has no platform to read, which is the same answer Android
				// gives: there is no system question for this build to ask, so the
				// arm is `unsupported` rather than a not-yet-answered `not-determined`.
				JSON.stringify({ status: 'unsupported' }),
			identify: async (externalId) => {
				this.identify(externalId);
				await settle();
			},
			logout: async () => {
				this.logout();
				await settle();
			},
			refresh: async () => {
				await this.refresh();
			},
			removeListeners: () => {
				// See `addListener`.
			},
			requestTrackingAuthorization: () =>
				// Rejected with the code the real Android bridge uses, so a host that
				// calls this against the fake sees the shape it would ship against.
				Promise.reject(
					Object.assign(
						new Error('The fake core has no platform gate to ask'),
						{
							code: 'C15T_TRACKING_UNSUPPORTED',
						}
					)
				),
			reset: async () => {
				this.resetConsent();
				await settle();
			},
			setOverrides: async (overrides) => {
				this.setOverrides(overrides);
				await settle();
			},
		};

		this.events = {
			addListener: (eventName, listener) => {
				const set = this.listeners.get(eventName) ?? new Set();
				set.add(listener);
				this.listeners.set(eventName, set);

				return {
					remove: () => {
						set.delete(listener);
					},
				};
			},
		};
	}

	/** Hydrate, then resolve policy on a timer, then start the sampler. */
	public boot(): void {
		const stored = this.sdk.readEnvelope();

		if (stored === null) {
			this.revision = 0;
			this.snapshot = denyAllSnapshot('fake core: first launch', 0);
			this.subjectId = newSubjectId();
			this.externalId = null;
			this.granted = {};
			this.noticeDismissed = false;
			this.queuedPayloads = [];
		} else {
			this.revision = stored.revision;
			// The cached snapshot answers immediately, before any network call.
			this.snapshot = stored.snapshot;
			this.subjectId = stored.subjectId;
			this.externalId = stored.externalId;
			this.granted = { ...stored.granted };
			this.noticeDismissed = stored.noticeDismissed;
			this.queuedPayloads = [...stored.queuedPayloads];
			this.overrides = stored.snapshot.overrides;
		}

		this.after(this.timings.hydrateDelayMs, () => {
			this.writeLog('info', `hydrated: revision ${String(this.revision)}`);
			this.patch({ ready: true });
			this.emit('initialized', { revision: this.revision });
		});

		this.after(this.timings.initDelayMs, () => {
			this.resolvePolicy();
		});

		this.every(this.timings.sampleIntervalMs, () => {
			this.sdk.publishSample({
				allowed: this.snapshot.effectivePermissions,
				at: Date.now(),
				revision: this.revision,
			});
		});

		this.driftRunning = this.sdk.isDriftEnabled;
		this.every(this.timings.driftIntervalMs, () => {
			this.drift();
		});
	}

	/** Stop every timer. Called on restart and on unmount. */
	public dispose(): void {
		for (const id of this.timerIds) {
			clearInterval(id);
		}
		this.timerIds.clear();
	}

	public setDriftEnabled(enabled: boolean): void {
		this.driftRunning = enabled;
	}

	/** Replay the queue, which is what a launch or a reconnect does. */
	public flushPending(): void {
		if (this.queuedPayloads.length === 0) {
			return;
		}

		if (!this.sdk.isOnline) {
			this.writeLog(
				'warn',
				`${String(this.queuedPayloads.length)} payload(s) still queued: offline`
			);
			return;
		}

		const count = this.queuedPayloads.length;
		this.queuedPayloads = [];
		this.persist();
		this.writeLog('info', `replayed ${String(count)} queued payload(s)`);
	}

	private async refresh(): Promise<void> {
		await settle();
		this.flushPending();

		if (!this.sdk.isOnline) {
			this.patch({
				error: {
					code: 'offline',
					message: 'refresh could not reach the backend',
				},
			});
			return;
		}

		this.patch({ error: null }, false);
		this.resolvePolicy();
	}

	private async commit(intentJson: string): Promise<string> {
		await settle();
		const intent = parseJson<CommitIntent>(intentJson);

		if (intent === null || typeof intent.action !== 'string') {
			const rejected: CommitResult = {
				confirmed: [],
				ok: false,
				queued: false,
				reason: 'invalid-intent',
				revision: null,
				subjectId: null,
			};

			return JSON.stringify(rejected);
		}

		const decided = decide(intent);
		this.granted = { ...this.granted, ...decided };
		this.noticeDismissed = true;

		const payload = JSON.stringify({
			action: intent.action,
			decided,
			subjectId: this.subjectId,
		});

		// The payload is stored before anything is delivered, so a process that
		// dies between the two still has the write.
		if (this.sdk.isOnline) {
			this.persist();
			this.writeLog(
				'info',
				`committed ${intent.action}: ${describeDecision(decided)}`
			);
		} else {
			this.queuedPayloads = [...this.queuedPayloads, payload].slice(
				-MAX_QUEUED_PAYLOADS
			);
			this.persist();
			this.writeLog('warn', `queued ${intent.action} for replay: offline`);
		}

		this.patch(
			{
				activeUI: null,
				error: null,
				...this.evaluation(),
			},
			true
		);

		const result: CommitResult = {
			confirmed: OPTIONAL_CATEGORIES.filter((category) =>
				Object.hasOwn(decided, category)
			),
			ok: true,
			queued: true,
			revision: this.revision,
			subjectId: this.subjectId,
		};

		return JSON.stringify(result);
	}

	private dismissNotice(): void {
		this.noticeDismissed = true;
		this.writeLog('info', 'notice dismissed: nothing written');
		this.patch({ activeUI: null, ...this.evaluation() });
	}

	private identify(externalId: string): void {
		this.externalId = externalId;
		this.writeLog('info', `identified ${externalId}`);
		this.patch({});
	}

	private logout(): void {
		this.externalId = null;
		this.writeLog('info', 'logged out: consent stays with the subject id');
		this.patch({});
	}

	/**
	 * Withdraw the decision and owe the prompt again, which is what `reset` is.
	 *
	 * The subject id stays, as the spec has it: the backend holds an audit history
	 * keyed to it. Whatever was still queued goes, because those bodies carry a
	 * decision the subject has just withdrawn. `resetStorage()` is the harder
	 * thing -- that one matches an uninstall.
	 */
	private resetConsent(): void {
		this.granted = {};
		this.noticeDismissed = false;
		this.queuedPayloads = [];
		this.writeLog('warn', 'consent wiped: the first-run prompt is owed again');
		this.patch({ activeUI: null, ...this.evaluation() });
	}

	private setOverrides(overridesJson: string): void {
		const overrides = parseJson<NativeOverridesInput>(overridesJson);

		if (overrides === null) {
			return;
		}

		this.overrides = mergeOverrides(this.overrides, overrides);
		this.writeLog(
			'info',
			`overrides: ${this.overrides.country ?? 'auto'} / ${this.overrides.language}`
		);
		this.patch(this.evaluation());
	}

	private resolvePolicy(): void {
		if (!this.sdk.isOnline) {
			this.patch({
				error: {
					code: 'offline',
					message: 'no transport: staying deny-all until a fetch succeeds',
				},
				policyPending: true,
			});
			this.writeLog('warn', 'init failed: offline, policy stays pending');
			return;
		}

		this.patch({
			policyPending: false,
			...this.evaluation(),
			resolution: {
				fingerprint: `fake-fp-${String(this.revision)}`,
				policyId: policyIdFor(resolveModel(this.overrides.country ?? null)),
				status: 'matched',
			},
		});
		this.writeLog('info', 'init resolved the policy');
	}

	/**
	 * Move one permission without a subject action, the way a re-resolution under
	 * a changed policy would. This is what makes the gating path visible on screen.
	 */
	private drift(): void {
		if (!this.driftRunning || this.snapshot.policyPending) {
			return;
		}

		const target = this.hooks.rotateDriftTarget();
		const next = !this.snapshot.effectivePermissions[target];

		this.patch({
			effectivePermissions: {
				...this.snapshot.effectivePermissions,
				[target]: next,
			},
		});
		this.writeLog('info', `drift: ${target} ${next ? 'allowed' : 'denied'}`);
	}

	/** Derive the policy-shaped fields from the state the core is holding. */
	private evaluation(): Partial<ConsentSnapshot> {
		const model = resolveModel(this.overrides.country);
		const effectivePermissions = emptyPermissions();
		const restrictions: ConsentSnapshot['restrictions'] = {};

		for (const category of OPTIONAL_CATEGORIES) {
			const choice = this.granted[category];
			effectivePermissions[category] = choice ?? model === 'opt-out';

			if (choice === false) {
				restrictions[category] = ['explicit-denial'];
			}
		}

		const hasChoice = Object.keys(this.granted).length > 0;
		const prompt = promptFor(hasChoice, model, this.noticeDismissed);

		return {
			activeUI: prompt.kind === 'none' ? null : 'banner',
			consentCategories: null,
			effectivePermissions,
			explicitChoice: hasChoice ? this.explicitChoice() : null,
			model,
			promptRequirement: prompt,
			restrictions,
		};
	}

	private explicitChoice(): ExplicitChoice {
		const categories: ExplicitChoice['categories'] = {};
		const confirmedAt = Date.now();

		for (const category of OPTIONAL_CATEGORIES) {
			const value = this.granted[category];

			if (value !== undefined) {
				categories[category] = {
					basis: { fingerprint: 'fake-fp', kind: 'choice-v1' },
					confirmedAt,
					value,
				};
			}
		}

		return { categories, version: 3 };
	}

	private patch(changes: Partial<ConsentSnapshot>, bumpRevision = true): void {
		if (bumpRevision) {
			this.revision += 1;
		}

		this.snapshot = {
			...this.snapshot,
			...changes,
			overrides: this.overrides,
			policySnapshotToken: `fake-token-${String(this.revision)}`,
			revision: this.revision,
			subject:
				this.externalId === null
					? { subjectId: this.subjectId }
					: { externalId: this.externalId, subjectId: this.subjectId },
		};

		this.persist();
		this.emit('snapshot', { revision: this.revision });
	}

	private persist(): void {
		this.sdk.writeEnvelope({
			externalId: this.externalId,
			granted: { ...this.granted },
			noticeDismissed: this.noticeDismissed,
			queuedPayloads: [...this.queuedPayloads],
			revision: this.revision,
			snapshot: this.snapshot,
			subjectId: this.subjectId,
		});
	}

	private getSnapshot(): string {
		return JSON.stringify(this.snapshot);
	}

	private bootstrap(): string {
		return JSON.stringify({
			hasStoredSnapshot: this.sdk.hasStoredSnapshot,
			maxSupportedProtocolVersion: PROTOCOL_VERSION,
			minSupportedProtocolVersion: PROTOCOL_VERSION,
			nativeSdkVersion: 'fake-native-stub',
			protocolVersion: PROTOCOL_VERSION,
			subjectId: this.subjectId,
		});
	}

	private emit(eventName: NativeEventName, payload: unknown): void {
		const text = JSON.stringify(payload);

		for (const listener of this.listeners.get(eventName) ?? []) {
			listener(text);
		}
	}

	private writeLog(level: FakeLogEntry['level'], text: string): void {
		this.sdk.writeLog(level, text);
	}

	private after(ms: number, work: () => void): void {
		const id = setInterval(() => {
			clearInterval(id);
			this.timerIds.delete(id);
			work();
		}, ms);

		this.timerIds.add(id);
	}

	private every(ms: number, work: () => void): void {
		const id = setInterval(work, ms);
		this.timerIds.add(id);
	}
}

/**
 * The fake core across restarts.
 *
 * One instance lives for the life of the JavaScript process. A real device keeps
 * its envelope in the Keychain or in encrypted storage, so killing the app does
 * not lose it; here that persistence is this object, `restart()` stands in for a
 * relaunch, and `resetStorage()` matches an uninstall.
 */
export class FakeNativeSdk {
	private readonly sampleChannel = new Channel<readonly PermissionSample[]>();
	private readonly logChannel = new Channel<readonly FakeLogEntry[]>();
	private readonly timings: Required<FakeNativeOptions>;

	private envelope: PersistedEnvelope | null = null;
	private session: FakeNativeSession | null = null;
	private sessionCount = 0;
	private driftCursor = 0;
	private online = true;
	private driftEnabled = true;

	public constructor(options: FakeNativeOptions = {}) {
		this.timings = {
			driftIntervalMs: options.driftIntervalMs ?? 6000,
			hydrateDelayMs: options.hydrateDelayMs ?? 450,
			initDelayMs: options.initDelayMs ?? 1400,
			sampleIntervalMs: options.sampleIntervalMs ?? 1000,
		};
	}

	/** Most recent sampler readings, newest first. */
	public get samples(): readonly PermissionSample[] {
		return this.sampleChannel.latest ?? [];
	}

	/** Most recent log lines, newest first. */
	public get log(): readonly FakeLogEntry[] {
		return this.logChannel.latest ?? [];
	}

	/** Subscribe to sampler readings. Fires immediately with what is buffered. */
	public readonly onSamples = this.sampleChannel.subscribe;

	/** Subscribe to log lines. Fires immediately with what is buffered. */
	public readonly onLog = this.logChannel.subscribe;

	/** Whether a write would reach the backend right now. */
	public get isOnline(): boolean {
		return this.online;
	}

	/** Whether the drift timer moves permissions on its own. */
	public get isDriftEnabled(): boolean {
		return this.driftEnabled;
	}

	/** Queued payloads waiting for connectivity. */
	public get pendingCount(): number {
		return this.envelope?.queuedPayloads.length ?? 0;
	}

	/** Whether anything was ever stored. This is what `hasStoredSnapshot` reads. */
	public get hasStoredSnapshot(): boolean {
		return this.envelope !== null;
	}

	/** Build a session: the module plus emitter `createConsentClient` takes. */
	public start(): FakeNativeSession {
		this.sessionCount += 1;

		const core = new FakeCore(this, this.timings, {
			rotateDriftTarget: () => {
				const target = DRIFT_ORDER[this.driftCursor] ?? 'measurement';
				this.driftCursor = (this.driftCursor + 1) % DRIFT_ORDER.length;
				return target;
			},
		});

		const session: FakeNativeSession = {
			core,
			events: core.events,
			id: this.sessionCount,
			module: core.module,
		};

		this.session = session;
		core.boot();

		return session;
	}

	/**
	 * Kill and relaunch. Timers die, a new module is built, and state comes back
	 * out of the envelope rather than out of memory, which is the whole reason to
	 * run this instead of reading it.
	 */
	public restart(): FakeNativeSession {
		this.stop();
		this.writeLog(
			'info',
			this.hasStoredSnapshot
				? 'cold start: hydrating from the stored envelope'
				: 'cold start: nothing stored, serving deny-all'
		);

		return this.start();
	}

	/** Stop the current session's timers. */
	public stop(): void {
		this.session?.core.dispose();
		this.session = null;
	}

	/** Forget everything, the way an uninstall does. */
	public resetStorage(): void {
		this.envelope = null;
		this.writeLog('warn', 'storage wiped: the subject starts fresh');
	}

	/** Flip connectivity. Going online replays the pending queue. */
	public setOnline(online: boolean): void {
		if (online === this.online) {
			return;
		}

		this.online = online;
		this.writeLog(
			online ? 'info' : 'warn',
			online ? 'back online' : 'offline: writes will queue'
		);

		if (online) {
			this.session?.core.flushPending();
		}
	}

	/** Turn the drift timer on or off. */
	public setDriftEnabled(enabled: boolean): void {
		this.driftEnabled = enabled;
		this.session?.core.setDriftEnabled(enabled);
	}

	/**
	 * Read by {@link FakeCore}, which is not exported to app code.
	 *
	 * @internal
	 */
	public readEnvelope(): PersistedEnvelope | null {
		return this.envelope;
	}

	/**
	 * Written by {@link FakeCore} after every committed change.
	 *
	 * @internal
	 */
	public writeEnvelope(envelope: PersistedEnvelope): void {
		this.envelope = envelope;
	}

	/** @internal */
	public publishSample(sample: PermissionSample): void {
		this.sampleChannel.publish([sample, ...this.samples].slice(0, 8));
	}

	/** @internal */
	public writeLog(level: FakeLogEntry['level'], text: string): void {
		this.logChannel.publish(
			[{ at: Date.now(), level, text }, ...this.log].slice(0, 40)
		);
	}
}
