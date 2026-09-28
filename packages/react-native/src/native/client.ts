/**
 * The JavaScript handle on the native consent kernel.
 *
 * One client per app. It reads the handshake once, decodes each snapshot
 * payload once, and hands consumers slices of that single immutable value.
 * There is deliberately no consent logic here: no evaluation, no storage, no
 * queue. The Swift and Kotlin cores own all of it, and this file only decides
 * when to pull a new snapshot and who needs to hear about it.
 *
 * Two rules shape the shape of this file:
 *
 * 1. The native side emits a revision, not a snapshot. A revision the client
 *    already holds costs nothing: no `getSnapshot()`, no `JSON.parse`.
 * 2. A subscriber is notified only when the value it selected changed, so a
 *    consent change that does not touch a component cannot rerender it.
 */

import { denyAllSnapshot } from '../lib/deny-all-snapshot';
import type { ConsentDecision } from '../lib/selectors';
import {
	categoryDecision,
	isCategoryAllowed,
	isSnapshotReady,
} from '../lib/selectors';
import { isTrackingPermitted } from '../lib/tracking';
import {
	describeSnapshotWireDrift,
	isProtocolVersionSupported,
	NATIVE_EVENT_NAMES,
	parseTrackingAuthorization,
	parseTrackingRequest,
} from '../protocol';
import type {
	BootstrapPayload,
	CommitIntent,
	CommitResult,
	ConsentSnapshot,
	NativeEventName,
	NativeOverridesInput,
	TrackingAuthorization,
	TrackingRequestPayload,
} from '../protocol';
import type { AllConsentNames } from '../protocol/vocabulary';
import { NativeBridgeError } from './bridge-error';
import { getNativeC15t, getNativeC15tEvents } from './module';
import type {
	NativeC15tTurboModule,
	NativeEventSubscription,
	NativeEventsLike,
} from './module';
import { C15tProtocolMismatchError } from './protocol-mismatch-error';

/**
 * Read one field out of a snapshot.
 */
export type SnapshotSelector<ResultType> = (
	snapshot: ConsentSnapshot
) => ResultType;

/**
 * Decide whether two selected values are the same for rendering purposes.
 */
export type SnapshotEquality<ResultType> = (
	current: ResultType,
	next: ResultType
) => boolean;

/**
 * The consent client the provider hands to hooks.
 */
export interface ConsentClient {
	/**
	 * Handshake payload, read once from `getBootstrap()` for the whole app.
	 */
	readonly bootstrap: BootstrapPayload;
	/**
	 * Read the current snapshot.
	 *
	 * Repeated calls on unchanged state return the identical frozen object, so
	 * it is safe as a store snapshot and cheap in a render path.
	 *
	 * @returns The snapshot the native core holds, or a deny-all snapshot when
	 *   the payload cannot be parsed and no earlier one exists.
	 */
	getSnapshot: () => ConsentSnapshot;
	/**
	 * Whether a category may run right now.
	 *
	 * @param category - Category to check.
	 * @returns `true` when the snapshot allows it.
	 */
	/**
	 * Why a category may or may not run, in the three states a host has to separate.
	 *
	 * `pending` while the native core has not been told yet, which is the state that
	 * tells an SDK to keep listening instead of giving up. Read off the same snapshot
	 * {@link ConsentClient.getSnapshot} returns, so the answer cannot disagree with
	 * what the consent UI is showing.
	 *
	 * @param category - Category to answer for.
	 * @returns `'granted'`, `'denied'`, or `'pending'`.
	 */
	decision: (category: AllConsentNames) => ConsentDecision;
	/**
	 * Whether a permission can be read as an answer rather than a placeholder.
	 *
	 * @returns `true` once hydration finished and the first init resolved a policy.
	 */
	isReady: () => boolean;
	/**
	 * Whether a category may run right now.
	 *
	 * @param category - Category to check.
	 * @returns `true` when the snapshot allows it.
	 */
	isAllowed: (category: AllConsentNames) => boolean;
	/**
	 * What the platform says about tracking, for the category an SDK is about to
	 * start.
	 *
	 * A read of state the operating system already holds, so it is synchronous and
	 * answers on the same thread as {@link ConsentClient.isAllowed}. The answer is
	 * cached, because reading the bridge on every render would keep returning what
	 * the first read returned: Apple resolves the arm at launch, and the only events
	 * that genuinely move it are a request through {@link requestTracking} and a
	 * subject coming back from the Settings app. The second is why this cache is not
	 * permanent, and {@link refreshTrackingAuthorization} is the read that clears it.
	 *
	 * This is never a consent answer. `unsupported` means the platform asks nothing
	 * of this build, which is Android's answer always and iOS's when the binary
	 * carries no `NSUserTrackingUsageDescription`.
	 *
	 * @returns The arm the native core reported, or `denied` when it reported
	 *   nothing this build can name.
	 */
	getTrackingAuthorization: () => TrackingAuthorization;
	/**
	 * Ask the platform for tracking authorization.
	 *
	 * Nothing in this package calls it. It belongs after the consent UI has been
	 * answered, because a platform prompt that arrives before the subject has been
	 * told anything is the rejection Apple writes back to the developer, and it is
	 * the ordering the ATT prompt string exists to serve.
	 *
	 * How often this can produce a prompt is Apple's decision and not this
	 * package's. Outside the European Union Apple shows its dialog once and answers
	 * from the device afterwards. Inside it, an answered request may be presented
	 * again a year after the answer, whichever way it went. So this always asks
	 * Apple and never answers from a cached arm, which is the only way an eligible
	 * install can ever be asked again, and it costs nothing when it is not eligible:
	 * Apple shows nothing and calls back with the arm on file. Nothing here prompts
	 * on its own, so a host that never calls this never re-prompts.
	 *
	 * It rejects with `C15T_TRACKING_NOT_CONFIGURED` on an iOS build that carries no
	 * `NSUserTrackingUsageDescription`, because Apple then suppresses the dialog and
	 * records the answer as denied without telling the host why, and with
	 * `C15T_TRACKING_UNSUPPORTED` on Android, where there is nothing to ask.
	 *
	 * @returns The arm the platform reported after the request settled. Use
	 *   {@link requestTracking} when the answer might be a pause rather than a
	 *   decision.
	 */
	requestTrackingAuthorization: () => Promise<TrackingAuthorization>;
	/**
	 * Ask the platform, and say how the request ended.
	 *
	 * Same call as {@link requestTrackingAuthorization}, with the two fields that
	 * make Apple's Additional Information tap legible. That tap closes Apple's sheet
	 * without an answer and still reports `not-determined`, so a caller reading only
	 * the arm cannot tell "the subject stopped to read more" from "nobody has been
	 * asked yet", and reporting the first as the second tells the subject they
	 * refused something they did not.
	 *
	 * {@link useTrackingRequest} is the surface most hosts want: it drives the
	 * preference centre through the pause, so nothing has to be assembled by hand.
	 *
	 * @returns The arm, the stage, and which call ran.
	 */
	requestTracking: () => Promise<TrackingRequestPayload>;
	/**
	 * Read the platform answer again, after a cached one.
	 *
	 * {@link getTrackingAuthorization} reads the bridge once and keeps the answer,
	 * which is right for a render path and wrong for the one moment the answer
	 * genuinely moves: the subject went to the Settings app, changed tracking, and
	 * came back. Apple tells a running process nothing when that happens, so this is
	 * the read that has to be asked for, and it is what {@link C15tProvider} calls
	 * when the app returns to the foreground.
	 *
	 * @returns The freshly read arm, with subscribers notified only when it moved.
	 */
	refreshTrackingAuthorization: () => TrackingAuthorization;
	/**
	 * Whether tracking behaviour may run for one category.
	 *
	 * Both halves have to say yes: the c15t decision for `category` must be
	 * `granted`, and the platform must not be holding tracking back. Neither half
	 * moves the other. A device with ATT authorized and the category denied is
	 * denied, and a policy that has not resolved stays `pending` no matter what
	 * Apple reported. See {@link isTrackingPermitted}.
	 *
	 * `necessary` is not a tracking category and returns `true`, exactly as
	 * {@link ConsentClient.decision} reports it as granted.
	 *
	 * @param category - Category the caller wants to run.
	 * @returns `true` when consent and the platform both allow it.
	 */
	isTrackingAllowed: (category: AllConsentNames) => boolean;
	/**
	 * Register interest in the platform tracking answer.
	 *
	 * The native cores push no tracking event, because there is nothing to push:
	 * the answer moves when the host asks for it and when the process relaunches.
	 * This exists so a hook can rerender on the request rather than poll the
	 * bridge.
	 *
	 * @internal
	 */
	subscribeTracking: (onTrackingChange: () => void) => () => void;
	/**
	 * Register interest in one slice of the snapshot.
	 *
	 * @param selector - Slice to watch.
	 * @param onStoreChange - Called when the selected value changes.
	 * @param equals - Comparison for the selected value. Defaults to `Object.is`.
	 * @returns A function that drops the subscription.
	 */
	subscribe: <ResultType>(
		selector: SnapshotSelector<ResultType>,
		onStoreChange: () => void,
		equals?: SnapshotEquality<ResultType>
	) => () => void;
	/**
	 * Forward a consent decision.
	 *
	 * @param intent - The action the subject took.
	 * @returns What the native core recorded.
	 */
	commit: (intent: CommitIntent) => Promise<CommitResult>;
	/**
	 * Pin geographic, language, or test overrides.
	 *
	 * @param overrides - Fields to change; omitted fields keep their value.
	 */
	setOverrides: (overrides: NativeOverridesInput) => Promise<void>;
	/**
	 * Record that the current notice was seen and dismissed. Local only.
	 */
	dismissNotice: () => void;
	/**
	 * Re-resolve policy, re-evaluate, and retry the offline queue.
	 */
	refresh: () => Promise<void>;
	/**
	 * Attach an external id and load that subject's stored record.
	 *
	 * @param externalId - Id from the app's own account system.
	 */
	identify: (externalId: string) => Promise<void>;
	/**
	 * Detach the external id. Consent stays with the c15t subject id.
	 */
	logout: () => Promise<void>;
	/**
	 * Wipe consent and go back to the state a first launch boots with.
	 *
	 * The choice prompt is owed again afterwards, so the banner or dialog comes
	 * back: this is a withdrawal, not a recorded reject-everything. The c15t
	 * subject id is kept.
	 */
	reset: () => Promise<void>;
	/**
	 * Detach from native events.
	 *
	 * @internal
	 */
	dispose: () => void;
}

/** One registered consumer and the value it last rendered. */
interface Subscriber<ResultType> {
	readonly selector: SnapshotSelector<ResultType>;
	readonly equals: SnapshotEquality<ResultType>;
	readonly onStoreChange: () => void;
	value: ResultType;
}

/**
 * Read an optional number from a native payload.
 *
 * @param payload - Parsed payload.
 * @param key - Field name.
 * @param fallback - Value to use when the field is absent or the wrong type.
 * @returns The field, or the fallback.
 */
const readNumber = function readNumber(
	payload: unknown,
	key: string,
	fallback: number
): number {
	const value = (payload as Record<string, unknown>)[key];

	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

/**
 * Read an optional string from a native payload.
 *
 * @param payload - Parsed payload.
 * @param key - Field name.
 * @param fallback - Value to use when the field is absent or the wrong type.
 * @returns The field, or the fallback.
 */
const readString = function readString(
	payload: unknown,
	key: string,
	fallback: string
): string {
	const value = (payload as Record<string, unknown>)[key];

	return typeof value === 'string' ? value : fallback;
};

/**
 * Whether warnings are worth printing where this code is running.
 *
 * Read off `globalThis` because a React Native bundle may have no `process` at all,
 * depending on the polyfill the bundler chose.
 */
const isProduction = function isProduction(): boolean {
	return (
		(globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
			?.NODE_ENV === 'production'
	);
};

/**
 * Name the keys a native snapshot got wrong, once per distinct set of problems.
 *
 * A renamed key is the failure this catches. The bridge crosses in a JSON string, so
 * TypeScript cannot see it, and every read of the moved field returns `undefined` with
 * nothing thrown: the app just shows an empty subject, or denies a category nobody
 * denied. Unknown keys stay quiet because the contract allows a newer native build to
 * add one.
 *
 * @param problems - Lines from {@link describeSnapshotWireDrift}.
 * @param seen - Holds the last set already reported, so a repeated snapshot is quiet.
 */
const warnSnapshotDrift = function warnSnapshotDrift(
	problems: readonly string[],
	seen: { value: string | null }
): void {
	if (problems.length === 0 || isProduction()) {
		return;
	}

	const signature = problems.join('\n');

	if (seen.value === signature) {
		return;
	}

	seen.value = signature;
	console.warn(
		'c15t ConsentClient: the native snapshot does not use the key names this package declares. Consent state may read as missing.',
		problems
	);
};

/**
 * Decide whether a parsed value can be used as a snapshot.
 *
 * Checks are shallow and target the fields the JavaScript layer actually reads,
 * so a native build that adds a field is fine and a native build that sends a
 * half-built payload is not.
 */
const isUsableSnapshot = function isUsableSnapshot(
	candidate: unknown
): candidate is ConsentSnapshot {
	if (typeof candidate !== 'object' || candidate === null) {
		return false;
	}

	const record = candidate as Record<string, unknown>;

	return (
		typeof record.revision === 'number' &&
		Number.isFinite(record.revision) &&
		typeof record.ready === 'boolean' &&
		typeof record.policyPending === 'boolean' &&
		typeof record.effectivePermissions === 'object' &&
		record.effectivePermissions !== null &&
		typeof record.promptRequirement === 'object' &&
		record.promptRequirement !== null
	);
};

/**
 * Parse the JSON string a native call returned.
 *
 * @param raw - JSON text from the bridge.
 * @returns The parsed value, or `null` when it is not a JSON object.
 */
const parseObject = function parseObject(raw: string): unknown {
	let parsed: unknown = null;

	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
		? parsed
		: null;
};

/**
 * Read the handshake payload.
 *
 * @param raw - JSON string from `getBootstrap()`.
 * @returns The bootstrap payload.
 * @throws {NativeBridgeError} When the payload will not parse.
 * @throws {C15tProtocolMismatchError} When no protocol version is reported.
 */
const parseBootstrap = function parseBootstrap(raw: string): BootstrapPayload {
	const parsed = parseObject(raw);

	if (parsed === null) {
		throw new NativeBridgeError(
			'@c15t/react-native could not read getBootstrap(): the native module returned text that is not a JSON object. The native build does not match this JavaScript package.'
		);
	}

	const { hasStoredSnapshot, protocolVersion, subjectId } = parsed as Record<
		string,
		unknown
	>;

	if (typeof protocolVersion !== 'number') {
		// A native build that reports no version predates the handshake, which
		// is a mismatch rather than a parse failure.
		throw new C15tProtocolMismatchError(null);
	}

	return {
		hasStoredSnapshot: hasStoredSnapshot === true,
		maxSupportedProtocolVersion: readNumber(
			parsed,
			'maxSupportedProtocolVersion',
			protocolVersion
		),
		minSupportedProtocolVersion: readNumber(
			parsed,
			'minSupportedProtocolVersion',
			protocolVersion
		),
		nativeSdkVersion: readString(parsed, 'nativeSdkVersion', 'unknown'),
		protocolVersion,
		subjectId: typeof subjectId === 'string' ? subjectId : null,
	};
};

/**
 * Read the revision out of a `snapshot` event payload.
 *
 * @param payload - Event payload, normally a JSON string such as
 *   `{"revision":7}`.
 * @returns The revision, or `null` when the payload does not carry one.
 */
const readEventRevision = function readEventRevision(
	payload: unknown
): number | null {
	let record: unknown = null;

	// A dictionary can arrive unserialized on Android, so both shapes are
	// accepted here rather than normalized upstream.
	if (typeof payload === 'string') {
		record = parseObject(payload);
	} else if (typeof payload === 'object' && payload !== null) {
		record = payload;
	}

	if (record === null) {
		return null;
	}

	const { revision } = record as Record<string, unknown>;

	return typeof revision === 'number' && Number.isFinite(revision)
		? revision
		: null;
};

/**
 * Build a consent client over a native module.
 *
 * The module and the emitter are injected so the client is testable without a
 * device and so an app can drive a mock through the same code path.
 *
 * @param nativeModule - The registered TurboModule.
 * @param events - Emitter for `snapshot`, `initialized`, and `error`.
 * @returns A client. Call {@link ConsentClient.dispose} to detach from events.
 * @throws {C15tProtocolMismatchError} When the native protocol is unsupported.
 * @throws {NativeBridgeError} When the bootstrap payload will not parse.
 */
export const createConsentClient = function createConsentClient(
	nativeModule: NativeC15tTurboModule,
	events: NativeEventsLike
): ConsentClient {
	const bootstrap = parseBootstrap(nativeModule.getBootstrap());

	if (!isProtocolVersionSupported(bootstrap.protocolVersion)) {
		throw new C15tProtocolMismatchError(bootstrap.protocolVersion);
	}

	/** Raw text of the snapshot last decoded, so unchanged bytes skip the parse. */
	let rawSnapshot: string | null = null;
	/** Last key drift reported, so one broken core warns once and not on every pull. */
	const drift = { value: null as string | null };
	/** Decoded snapshot, kept so consumers read one immutable object. */
	let snapshot: ConsentSnapshot | null = null;
	/** Set when native said something changed and nothing has pulled yet. */
	let stale = true;
	/** Native event subscriptions, held for the life of the client. */
	let eventSubscriptions: NativeEventSubscription[] = [];

	/**
	 * Platform tracking arm, cached between the reads that can actually move it. See
	 * {@link ConsentClient.getTrackingAuthorization} for why a read on every render
	 * is wasted work, and {@link ConsentClient.refreshTrackingAuthorization} for the
	 * one moment it is not.
	 */
	let tracking: TrackingAuthorization | null = null;
	/** Consumers that watch the platform answer and no slice of the snapshot. */
	const trackingSubscribers = new Set<() => void>();
	/** Keeps the missing-surface warning to one line per client. */
	const missingTrackingSurface = { value: false };

	const subscribers = new Set<Subscriber<unknown>>();

	/** Pull from native and decode only when the bytes actually changed. */
	const pullSnapshot = function pullSnapshot(): ConsentSnapshot {
		const raw = nativeModule.getSnapshot();

		stale = false;

		if (raw === rawSnapshot && snapshot !== null) {
			return snapshot;
		}

		rawSnapshot = raw;

		const parsed = parseObject(raw);

		if (!isUsableSnapshot(parsed)) {
			// Fail closed: keep the last snapshot the app already rendered
			// rather than invent one, and deny everything when there is none.
			snapshot ??= denyAllSnapshot(
				'getSnapshot() returned text that is not a readable consent snapshot, so every optional category is denied until the native core reports again.',
				0
			);

			return snapshot;
		}

		snapshot = parsed;
		warnSnapshotDrift(
			describeSnapshotWireDrift(parsed, { allowUnknownKeys: true }),
			drift
		);

		return snapshot;
	};

	/** The snapshot to hand out now, pulling only when something moved. */
	const currentSnapshot = function currentSnapshot(): ConsentSnapshot {
		return stale || snapshot === null ? pullSnapshot() : snapshot;
	};

	/** Tell each subscriber whose slice moved, and only those. */
	const notify = function notify(): void {
		const current = pullSnapshot();

		for (const subscriber of [...subscribers]) {
			const next = subscriber.selector(current);

			if (subscriber.equals(subscriber.value, next)) {
				continue;
			}

			subscriber.value = next;
			subscriber.onStoreChange();
		}
	};

	/** Stop pulling for an empty tree, and re-check state on the next mount. */
	const handleEvent = function handleEvent(
		eventName: NativeEventName,
		payload: unknown
	): void {
		const revision = readEventRevision(payload);

		if (
			eventName === 'snapshot' &&
			revision !== null &&
			snapshot !== null &&
			revision === snapshot.revision
		) {
			return;
		}

		if (subscribers.size === 0) {
			stale = true;
			return;
		}

		notify();
	};

	const stopListening = function stopListening(): void {
		for (const subscription of eventSubscriptions) {
			subscription.remove();
		}

		eventSubscriptions = [];
	};

	const startListening = function startListening(): void {
		if (eventSubscriptions.length > 0) {
			return;
		}

		eventSubscriptions = NATIVE_EVENT_NAMES.map((eventName) =>
			events.addListener(eventName, (payload: unknown) => {
				handleEvent(eventName, payload);
			})
		);
	};

	/**
	 * Run a native mutation, then reconcile.
	 *
	 * Reconciling here rather than waiting for the event means a resolved
	 * promise and the rendered snapshot never disagree, which is what a caller
	 * that awaits `acceptAll()` and then reads `useConsent()` expects.
	 */
	const afterMutation = async function afterMutation<ReturnType>(
		settled: Promise<ReturnType>
	): Promise<ReturnType> {
		const value = await settled;

		stale = true;

		if (subscribers.size > 0) {
			notify();
		}

		return value;
	};

	/**
	 * Say once that the binary predates the tracking surface.
	 *
	 * A JavaScript-only update can ship a bundle that calls a method the binary in
	 * the user's hand does not have, and the protocol handshake cannot catch it:
	 * adding a method is an additive change. Failing closed is the answer that is
	 * safe to be wrong about, because the alternative reads "the native build could
	 * not tell me" as "the platform asks nothing of us" and starts tracking on a
	 * device where nobody was asked.
	 */
	const warnTrackingSurfaceMissing =
		function warnTrackingSurfaceMissing(): void {
			if (missingTrackingSurface.value || isProduction()) {
				return;
			}

			missingTrackingSurface.value = true;
			console.warn(
				'c15t ConsentClient: this native build has no tracking authorization methods, so tracking is treated as denied. Rebuild the app: a JavaScript update cannot add a native method.',
				'Rebuilding is the fix. Until then `isTrackingAllowed` answers false and `requestTrackingAuthorization` rejects.'
			);
		};

	/** The platform arm, pulled from native at most once. */
	const currentTracking = function currentTracking(): TrackingAuthorization {
		if (tracking !== null) {
			return tracking;
		}

		if (typeof nativeModule.getTrackingAuthorization !== 'function') {
			warnTrackingSurfaceMissing();

			// Left uncached on purpose: a host that rebuilds recovers without a
			// reset hook, and a warning that never repeats already covers the noise.
			return 'denied';
		}

		tracking = parseTrackingAuthorization(
			nativeModule.getTrackingAuthorization()
		);

		return tracking;
	};

	/** Tell the consumers that watch the platform answer and nothing else. */
	const notifyTracking = function notifyTracking(): void {
		for (const onTrackingChange of [...trackingSubscribers]) {
			onTrackingChange();
		}
	};

	/**
	 * Forward the platform request.
	 *
	 * The rejection carries the reason from the native side, which is where the
	 * difference between "this build cannot prompt" and "Android has no such
	 * question" lives.
	 */
	const requestTracking =
		async function requestTracking(): Promise<TrackingRequestPayload> {
			if (typeof nativeModule.requestTrackingAuthorization !== 'function') {
				warnTrackingSurfaceMissing();

				throw new NativeBridgeError(
					'@c15t/react-native cannot request tracking authorization: this native build has no requestTrackingAuthorization method. Rebuild the app so the binary matches this package; a JavaScript update cannot add it.'
				);
			}

			let outcome: TrackingRequestPayload;

			try {
				outcome = parseTrackingRequest(
					await nativeModule.requestTrackingAuthorization()
				);
			} catch (error: unknown) {
				// Whether the prompt appeared is unknown from here, so drop the cached
				// arm and let the next read ask the platform rather than trust a stale
				// one.
				tracking = null;

				throw error;
			}

			tracking = outcome.status;

			// Deliberately no `stale = true` and no snapshot notify. The platform
			// answer is not consent: a prompt that changed nothing about any category
			// must not reach a tree that subscribed to categories, and the consent
			// decision a subscriber reads has to be identical before and after.
			notifyTracking();

			return outcome;
		};

	const requestTrackingAuthorization =
		async function requestTrackingAuthorization(): Promise<TrackingAuthorization> {
			return (await requestTracking()).status;
		};

	const refreshTrackingAuthorization =
		function refreshTrackingAuthorization(): TrackingAuthorization {
			const before = tracking;

			// Dropped rather than overwritten, so the read goes through the same path a
			// first read takes, including the feature detection for a binary that has no
			// tracking surface at all.
			tracking = null;

			const after = currentTracking();

			// `before === null` means nobody had read the arm yet, so there is nothing for a
			// subscriber to be out of date about and a notification would be a rerender for
			// a value nothing was holding.
			if (before !== null && before !== after) {
				notifyTracking();
			}

			return after;
		};

	// Attach for the life of the client, not the life of a subscription. The
	// pull is still skipped while nothing is mounted, so an idle tree costs no
	// bridge reads, but a read made after a native-only change sees the change
	// instead of a cached snapshot.
	startListening();

	const commit = async function commit(
		intent: CommitIntent
	): Promise<CommitResult> {
		const raw = await nativeModule.commit(JSON.stringify(intent));
		const parsed = parseObject(raw);

		if (
			parsed === null ||
			typeof (parsed as Record<string, unknown>).ok !== 'boolean'
		) {
			throw new NativeBridgeError(
				'@c15t/react-native could not read the commit result: the native module replied with text that is not a CommitResult JSON object.'
			);
		}

		// The only field the read path uses is `ok`, and that is guarded above.
		// Everything else rides along, so a native core that adds a field does
		// not have to wait for this package to learn about it.
		const result = parsed as CommitResult;

		return afterMutation(Promise.resolve(result));
	};

	return {
		bootstrap,
		commit,
		decision: (category: AllConsentNames) =>
			categoryDecision(currentSnapshot(), category),
		dismissNotice: () => {
			nativeModule.dismissNotice();
			stale = true;

			if (subscribers.size > 0) {
				notify();
			}
		},
		dispose: (): void => {
			stopListening();
			trackingSubscribers.clear();
		},
		getSnapshot: currentSnapshot,
		getTrackingAuthorization: currentTracking,
		identify: (externalId: string) =>
			afterMutation(nativeModule.identify(externalId)),
		isAllowed: (category: AllConsentNames) =>
			isCategoryAllowed(currentSnapshot(), category),
		isReady: () => isSnapshotReady(currentSnapshot()),
		isTrackingAllowed: (category: AllConsentNames): boolean =>
			// `necessary` is not a tracking behaviour, so the platform gate does not
			// apply to it and it reads the same way `decision` reads it: granted.
			category === 'necessary' ||
			isTrackingPermitted(
				categoryDecision(currentSnapshot(), category),
				currentTracking()
			),
		logout: () => afterMutation(nativeModule.logout()),
		refresh: () => afterMutation(nativeModule.refresh()),
		refreshTrackingAuthorization,
		requestTracking,
		requestTrackingAuthorization,
		reset: async (): Promise<void> => {
			// A JavaScript update can ship a bundle that calls a wipe the binary in
			// the user's hand does not have, and the handshake cannot catch it:
			// adding a method is additive. There is no safe stand-in for a wipe
			// here, so this rejects and names the fix.
			if (typeof nativeModule.reset !== 'function') {
				throw new NativeBridgeError(
					'@c15t/react-native cannot reset consent: this native build has no reset method. Rebuild the app so the binary matches this package; a JavaScript update cannot add it.'
				);
			}

			await afterMutation(nativeModule.reset());
		},
		setOverrides: (overrides: NativeOverridesInput) =>
			afterMutation(nativeModule.setOverrides(JSON.stringify(overrides))),
		subscribe: <ResultType>(
			selector: SnapshotSelector<ResultType>,
			onStoreChange: () => void,
			equals: SnapshotEquality<ResultType> = Object.is
		): (() => void) => {
			const subscriber = {
				equals: equals as SnapshotEquality<unknown>,
				onStoreChange,
				selector: selector as SnapshotSelector<unknown>,
				// Seed from the snapshot already decoded rather than forcing a
				// pull, so a resubscribe costs no bridge read. An event that
				// arrived while nobody was mounted already set `stale`.
				value: selector(currentSnapshot()),
			};

			subscribers.add(subscriber);

			return () => {
				subscribers.delete(subscriber);
			};
		},
		subscribeTracking: (onTrackingChange: () => void): (() => void) => {
			trackingSubscribers.add(onTrackingChange);

			return () => {
				trackingSubscribers.delete(onTrackingChange);
			};
		},
	};
};

/**
 * The one client for the running app, or `null` before the first provider.
 *
 * `getBootstrap()` is the handshake and the subject read, so it happens once
 * however many providers and consumers mount.
 */
let client: ConsentClient | null = null;

/**
 * Get the app's consent client, creating it on first use.
 *
 * @returns The shared client, attached to the registered native module.
 * @throws {NativeC15tUnavailableError} When the native module is missing.
 * @throws {C15tProtocolMismatchError} When the native protocol is unsupported.
 */
export const getConsentClient = function getConsentClient(): ConsentClient {
	if (client === null) {
		client = createConsentClient(getNativeC15t(), getNativeC15tEvents());
	}

	return client;
};

/**
 * Drop the shared client and its native listener.
 *
 * Host-app tests need this between cases, and a test harness that swaps the
 * native module needs it too. Production code should never call it: the client
 * lives as long as the app.
 *
 * @internal
 */
export const resetConsentClient = function resetConsentClient(): void {
	client?.dispose();
	client = null;
};
