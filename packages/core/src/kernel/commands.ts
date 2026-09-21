/**
 * Async commands exposed at `kernel.commands.*`.
 *
 * Commands are the I/O boundary of the kernel: each one optionally
 * delegates to a transport for network I/O, but otherwise operates on
 * snapshot data only. Commands emit their lifecycle events
 * (`*:started`, `*:completed`, `command:error`).
 *
 * Only `save()` records an explicit choice, and it captures one action
 * time before any yield, network call or persistence. `dismissNotice()`
 * records the local dismissal only. `init()` folds a complete transport
 * response and installs the deadline timer.
 */

import { recordCategoryPatch } from '../consent-record/record';
import type {
	ConsentSubject,
	OptionalConsentCategory,
} from '../consent-record/types';
import type { AllConsentNames } from '../consent/consent-types';
import { generateSubjectId } from '../libs/generate-subject-id';
import { extractConsentNamesFromCondition, has } from '../libs/has';
import type { HasCondition } from '../libs/has';
import { presentedSelection, scopeSelection } from '../policy';
import type { PresentedSelection } from '../policy';
import type {
	ConsentSnapshot,
	ConsentState,
	ExplicitChoice,
	InitContext,
	InitResult,
	KernelConfig,
	KernelIABAuthority,
	KernelTransport,
	KernelUser,
	NoticeDismissResult,
	SaveInput,
	SavePayload,
	SaveResult,
	VendorChoice,
} from '../types';
import { applyInitResponse } from './apply-init-response';
import type { SnapshotPatch } from './patch';
import { createPendingSaveQueue } from './pending-saves';
import type { KernelRuntime } from './runtime';
import { selectSavePayload } from './save-selection';
import { copyIABAuthority } from './snapshot';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30_000;

interface InitRetryPolicy {
	maxAttempts: number;
	baseDelayMs: number;
	maxDelayMs: number;
}

const normalizeNonNegativeNumber = function normalizeNonNegativeNumber(
	value: number | undefined,
	fallback: number
): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? value
		: fallback;
};

const resolveInitRetryPolicy = function resolveInitRetryPolicy(
	config: KernelConfig['initRetry']
): InitRetryPolicy | null {
	if (config === false) {
		return null;
	}

	return {
		baseDelayMs: normalizeNonNegativeNumber(
			config?.baseDelayMs,
			DEFAULT_BASE_DELAY_MS
		),
		maxAttempts: Math.max(
			1,
			Math.floor(
				normalizeNonNegativeNumber(config?.maxAttempts, DEFAULT_MAX_ATTEMPTS)
			)
		),
		maxDelayMs: normalizeNonNegativeNumber(
			config?.maxDelayMs,
			DEFAULT_MAX_DELAY_MS
		),
	};
};

const getRetryDelay = function getRetryDelay(
	policy: InitRetryPolicy,
	attempt: number
): number {
	const exponentialDelay = policy.baseDelayMs * 2 ** (attempt - 1);
	const cappedDelay = Math.min(exponentialDelay, policy.maxDelayMs);
	const jitterMultiplier = 0.5 + Math.random() * 0.5;
	return Math.floor(cappedDelay * jitterMultiplier);
};

const isProduction = function isProduction(): boolean {
	const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
		.process?.env?.NODE_ENV;
	return nodeEnv === 'production';
};

const warnInitFailure = function warnInitFailure(
	nextRetryMs: number | null
): void {
	if (isProduction()) {
		return;
	}

	const retryMessage =
		nextRetryMs === null
			? 'No retry is scheduled.'
			: `A retry is scheduled in ${nextRetryMs} ms.`;
	console.warn(
		`[c15t] Backend/manifest init failed. The consent banner is withheld and optional categories stay denied. ${retryMessage}`
	);
};

/**
 * Patch that clears every policy-derived field for a transport failure
 * before the safe fallback applies. A stale permissive policy must not
 * survive a failed init.
 */
const failedResolutionPatch = function failedResolutionPatch(
	current: ConsentSnapshot,
	now: number
): SnapshotPatch {
	const patch: SnapshotPatch = {
		now,
		policySnapshotToken: null,
		resolution: { policy: null, reason: 'transport', status: 'failed' },
	};
	if (current.iab?.enabled) {
		patch.iab = { ...current.iab, enabled: false };
	}
	return patch;
};

/**
 * Values one save input confirms. Object input is passed through untouched
 * so the record helper validates it and reports the exact issue.
 */
export const resolveSaveSelection = function resolveSaveSelection(
	snapshot: ConsentSnapshot,
	draft: PresentedSelection | null,
	input: SaveInput | undefined,
	categories?: readonly AllConsentNames[]
): { values: unknown; consentAction: SavePayload['consentAction'] } {
	const rule = snapshot.policyRule;
	const choiceScope = snapshot.evaluationPolicy.choiceScope ?? rule.scope;
	const displayed =
		categories === undefined
			? choiceScope
			: choiceScope.filter((category) => categories.includes(category));
	const narrow = (values: PresentedSelection) =>
		displayed.length === rule.scope.length
			? values
			: Object.fromEntries(
					displayed.map((category) => [category, values[category]])
				);
	if (input === 'all' || input === 'none') {
		const bulkAction = input === 'all' ? 'all' : 'necessary';
		return {
			consentAction:
				displayed.length === rule.scope.length ? bulkAction : 'custom',
			values: narrow(scopeSelection(rule, input === 'all')),
		};
	}
	if (input === undefined) {
		return {
			consentAction: 'custom',
			values: narrow(presentedSelection(rule, draft, snapshot.explicitChoice)),
		};
	}
	return { consentAction: 'custom', values: input };
};

const EMPTY_CHOICE: ExplicitChoice = Object.freeze({
	categories: Object.freeze({}),
	version: 3,
}) as ExplicitChoice;

/** Own string keys mapped to booleans. Rejects anything else. */
const isVendorGrantMap = function isVendorGrantMap(
	value: unknown
): value is Record<string, boolean> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	return Object.entries(value).every(
		([id, granted]) => id.length > 0 && typeof granted === 'boolean'
	);
};

const sameVendorChoice = function sameVendorChoice(
	left: VendorChoice | null,
	right: VendorChoice | null
): boolean {
	if (left === right) {
		return true;
	}
	if (!left || !right) {
		return false;
	}
	return (
		left.denied.length === right.denied.length &&
		left.denied.every((id, index) => id === right.denied[index])
	);
};

/** Ids a save may toggle: declared and not `disabled`. */
const toggleableVendorIds = function toggleableVendorIds(
	snapshot: ConsentSnapshot
): ReadonlySet<string> {
	const ids = new Set<string>();
	for (const vendor of snapshot.vendors?.declared ?? []) {
		if (vendor.disabled !== true) {
			ids.add(vendor.id);
		}
	}
	return ids;
};

/**
 * The state after every denial is lifted. A decision that once denied
 * something becomes an empty list that keeps its time, so a newest-wins
 * merge with an older server read cannot re-deny what the visitor just
 * granted. Nothing ever decided stays `null`.
 */
const clearedVendorChoice = function clearedVendorChoice(
	current: VendorChoice | null,
	actionAt: number
): VendorChoice | null {
	if (current === null || current.denied.length === 0) {
		return current;
	}
	return { confirmedAt: actionAt, denied: [], version: 1 };
};

/** Whether a narrowed bulk action names every category the visitor decides. */
const coversChoiceScope = function coversChoiceScope(
	snapshot: ConsentSnapshot,
	categories: readonly AllConsentNames[]
): boolean {
	const scope =
		snapshot.evaluationPolicy.choiceScope ?? snapshot.policyRule.scope;
	// An empty scope is vacuously covered by `every`, and the visitor decides
	// nothing in it, so a narrowed action there is not the full clear.
	return (
		scope.length > 0 && scope.every((category) => categories.includes(category))
	);
};

/** A condition's outcome, `null` when it cannot be evaluated. */
const conditionOutcome = function conditionOutcome(
	condition: HasCondition<AllConsentNames>,
	consents: ConsentState
): boolean | null {
	try {
		return has(condition, consents);
	} catch {
		return null;
	}
};

/**
 * The state after a bulk action narrowed to some categories. A denial is
 * lifted only for a vendor the action decides on its own: one of its
 * categories is selected, and the selected categories are what settles its
 * condition. A vendor under `{ or: [marketing, measurement] }` keeps its
 * denial when only measurement is rejected, since the still-granted
 * marketing branch would load it at once; one under `{ not: marketing }` is
 * decided by rejecting marketing, and its denial lifts. Decided means the
 * outcome differs between the selected categories set to what the action
 * makes them and set to the opposite, with everything else at its effective
 * value. Every other denial stays. Stamped like a full bulk action once a
 * governed vendor exists.
 */
const scopedBulkVendorChoice = function scopedBulkVendorChoice(
	snapshot: ConsentSnapshot,
	categories: readonly AllConsentNames[],
	granted: boolean,
	actionAt: number
): VendorChoice | null {
	const current = snapshot.vendorChoice;
	const afterAction: ConsentState = { ...snapshot.effectivePermissions };
	const otherwise: ConsentState = { ...snapshot.effectivePermissions };
	for (const category of categories) {
		afterAction[category] = granted;
		otherwise[category] = !granted;
	}
	const governed = new Set<string>();
	for (const vendor of snapshot.vendors?.declared ?? []) {
		const names = extractConsentNamesFromCondition(vendor.category);
		if (!names.some((name) => categories.includes(name))) {
			continue;
		}
		const decided =
			conditionOutcome(vendor.category, afterAction) !==
			conditionOutcome(vendor.category, otherwise);
		if (decided) {
			governed.add(vendor.id);
		}
	}
	if (governed.size === 0) {
		return current;
	}
	const denied = (current?.denied ?? []).filter((id) => !governed.has(id));
	if (current && denied.length === current.denied.length) {
		// Nothing governed was denied. Stamp the clear the way a full bulk
		// action does, unless the current record is already at least as new.
		return current.confirmedAt >= actionAt
			? current
			: { confirmedAt: actionAt, denied: [...current.denied], version: 1 };
	}
	return { confirmedAt: actionAt, denied, version: 1 };
};

/**
 * The state after a bulk action. Unlike lifting the last denial, a bulk
 * action is always stamped once vendors are declared, even over `null` or an
 * already-empty list: a server denial recorded before the visitor pressed
 * accept all, but arriving afterwards, must lose to it in the merge.
 */
const bulkClearedVendorChoice = function bulkClearedVendorChoice(
	snapshot: ConsentSnapshot,
	actionAt: number
): VendorChoice | null {
	const current = snapshot.vendorChoice;
	if ((snapshot.vendors?.declared.length ?? 0) === 0) {
		return current;
	}
	if (current?.denied.length === 0 && current.confirmedAt >= actionAt) {
		return current;
	}
	return { confirmedAt: actionAt, denied: [], version: 1 };
};

/** Sorted denial list after applying grants on top of the current one. */
const applyVendorGrants = function applyVendorGrants(
	snapshot: ConsentSnapshot,
	current: readonly string[] | undefined,
	grants: Readonly<Record<string, boolean>> | undefined
): string[] {
	const toggleable = toggleableVendorIds(snapshot);
	const denied = new Set<string>(current);
	for (const [id, granted] of Object.entries(grants ?? {})) {
		if (!toggleable.has(id)) {
			continue;
		}
		if (granted) {
			denied.delete(id);
		} else {
			denied.add(id);
		}
	}
	return [...denied].sort();
};

/**
 * The vendor denial list one save leaves behind.
 *
 * - Under `model === 'iab'` the vendor axis is inert: IAB vendor consent is
 *   authoritative and nothing here changes.
 * - `'all'` and `'none'` clear the list: vendors follow the category, and
 *   any explicit grants or staged draft are ignored. Narrowed to displayed
 *   `categories`, only the denials of vendors those categories govern lift.
 * - Otherwise explicit grants win over the staged vendor draft, applied on
 *   top of the current denials. Ids that are not declared, or are declared
 *   `disabled`, are ignored.
 *
 * Lifting every denial leaves a timestamped empty list, never `null`: `null`
 * means no vendor decision was ever made, and an explicit grant over `null`
 * is a decision too. Explicit grants always take the action time, even for
 * an unchanged list; a staged draft or nothing usable returns the current
 * value, so a no-input save never renews the time.
 */
export const resolveVendorSelection = function resolveVendorSelection(
	snapshot: ConsentSnapshot,
	draft: Readonly<Record<string, boolean>> | null,
	input: SaveInput | undefined,
	explicit: Record<string, boolean> | undefined,
	actionAt: number,
	categories?: readonly AllConsentNames[]
): VendorChoice | null {
	const current = snapshot.vendorChoice;
	if (snapshot.model === 'iab') {
		return current;
	}
	const bulk = input === 'all' || input === 'none';
	if (bulk) {
		// Vendors follow the category on a bulk action; explicit grants and the
		// staged draft are both discarded so nothing survives as a denial.
		// A bulk action that covers every category the policy lets the
		// visitor decide is the stock accept or reject all, whichever surface
		// sent it: nothing outside it can hold a denial in place, so it
		// clears the list outright. Only a narrower action lifts denials
		// selectively.
		if (categories === undefined || coversChoiceScope(snapshot, categories)) {
			return bulkClearedVendorChoice(snapshot, actionAt);
		}
		return scopedBulkVendorChoice(
			snapshot,
			categories,
			input === 'all',
			actionAt
		);
	}
	const grants = explicit ?? draft ?? undefined;
	if (grants === undefined) {
		return current;
	}
	const toggleable = toggleableVendorIds(snapshot);
	const usable = Object.keys(grants).some((id) => toggleable.has(id));
	if (!usable) {
		return current;
	}
	const denied = applyVendorGrants(snapshot, current?.denied, grants);
	if (denied.length === 0) {
		// An explicit grant is a decision even when it denies nothing: over
		// `null` or an already-empty list it leaves a freshly timestamped
		// empty record, so an older server denial arriving afterwards loses
		// the merge to what the visitor chose. A staged draft only lifts.
		return current === null || explicit !== undefined
			? { confirmedAt: actionAt, denied: [], version: 1 }
			: clearedVendorChoice(current, actionAt);
	}
	const next: VendorChoice = { confirmedAt: actionAt, denied, version: 1 };
	// An explicit grant is a fresh confirmation even when the list is the same,
	// like a category reconfirmation: a server read taken between the old time
	// and now must not undo what the visitor just reaffirmed. A staged draft
	// that changes nothing keeps the old time, so a no-input save is a no-op.
	if (explicit !== undefined) {
		return next;
	}
	return sameVendorChoice(current, next) ? current : next;
};

/**
 * Granted flag for every declared vendor, for the transport payload. Only
 * present once a vendor decision exists locally: a save that never decided
 * vendors must not tell the backend every vendor was granted now, or an
 * older server denial still in flight would win the local merge while the
 * backend holds the newer all-granted map.
 */
const vendorChoicePayload = function vendorChoicePayload(
	snapshot: ConsentSnapshot
): SavePayload['vendorChoice'] {
	const declared = snapshot.vendors?.declared ?? [];
	if (
		snapshot.model === 'iab' ||
		declared.length === 0 ||
		snapshot.vendorChoice === null
	) {
		return undefined;
	}
	const denied = new Set(snapshot.vendorChoice.denied);
	const grants: Record<string, boolean> = {};
	for (const vendor of declared) {
		Object.defineProperty(grants, vendor.id, {
			configurable: true,
			enumerable: true,
			value: !denied.has(vendor.id),
			writable: true,
		});
	}
	// A denial the local record still holds for a vendor nothing declares
	// right now travels too. The backend reads the map as the whole
	// decision, so leaving it out would tell every other device the visitor
	// granted a vendor they turned off, and a later redeclaration would
	// split the devices. Locally the gate already ignores it.
	for (const id of denied) {
		if (!Object.hasOwn(grants, id)) {
			Object.defineProperty(grants, id, {
				configurable: true,
				enumerable: true,
				value: false,
				writable: true,
			});
		}
	}
	return {
		confirmedAt: snapshot.vendorChoice.confirmedAt,
		grants,
		version: 1,
	};
};

/** A save's action time must be a past or present safe integer. */
const isValidSaveActionAt = function isValidSaveActionAt(
	actionAt: number,
	currentTime: number
): boolean {
	return (
		Number.isSafeInteger(actionAt) && actionAt >= 0 && actionAt <= currentTime
	);
};

/**
 * A `none` regime owes no choice: nothing is recorded, written, sent or
 * announced, because permissions are already granted by default. Returns
 * the completed result for that case, or `null` when the save proceeds.
 */
const saveUnderNoneRegime = function saveUnderNoneRegime(
	snapshot: ConsentSnapshot
): SaveResult | null {
	if (snapshot.evaluationPolicy.model !== 'none') {
		return null;
	}
	return { confirmed: [], ok: true, subjectId: snapshot.subject?.subjectId };
};

/** Subject written by a save: the stored identifiers plus the current user's. */
const saveSubject = function saveSubject(
	snapshot: ConsentSnapshot,
	subjectId: string
): ConsentSubject {
	const subject: ConsentSubject = { ...snapshot.subject, subjectId };
	if (snapshot.user?.externalId) {
		subject.externalId = snapshot.user.externalId;
		if (snapshot.user.identityProvider) {
			subject.identityProvider = snapshot.user.identityProvider;
		}
	}
	return subject;
};

/** Capture the action’s policy evidence before init or navigation changes it. */
const saveDecisionInputs = (
	snapshot: ConsentSnapshot
): Pick<SavePayload, 'decisionInputs'> => {
	if (
		snapshot.resolution.status !== 'no-match' &&
		snapshot.resolution.status !== 'matched'
	) {
		return {};
	}
	return {
		decisionInputs: {
			country: snapshot.location
				? snapshot.location.countryCode
				: (snapshot.overrides.country ?? null),
			fingerprint:
				snapshot.resolution.status === 'matched'
					? snapshot.resolution.fingerprints.policy
					: undefined,
			gpc: snapshot.privacySignals.gpc.active,
			language:
				snapshot.translations?.language ?? snapshot.overrides.language ?? 'en',
			policyId:
				snapshot.resolution.status === 'matched'
					? snapshot.resolution.policyId
					: null,
			region: snapshot.location
				? snapshot.location.regionCode
				: (snapshot.overrides.region ?? null),
		},
	};
};

const isRecord = function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
};

/** Validate addon metadata before the local action can mutate any state. */
const validSaveAuthority = function validSaveAuthority(
	value: unknown,
	snapshot: ConsentSnapshot,
	actionAt: number,
	now: number
): value is KernelIABAuthority {
	if (!isRecord(value)) {
		return false;
	}
	const authority = value;
	return (
		snapshot.model === 'iab' &&
		snapshot.resolution.status === 'matched' &&
		snapshot.iab?.enabled === true &&
		typeof authority.tcString === 'string' &&
		authority.tcString.length > 0 &&
		authority.choiceFingerprint ===
			snapshot.evaluationPolicy.choice.fingerprint &&
		authority.confirmedAt === actionAt &&
		typeof authority.expiresAt === 'number' &&
		Number.isSafeInteger(authority.expiresAt) &&
		authority.expiresAt > now &&
		authority.expiresAt > actionAt &&
		authority.expiresAt <=
			actionAt +
				Math.min(
					snapshot.evaluationPolicy.choice.maxAgeMs ?? 395 * 86400000,
					395 * 86400000
				) &&
		[
			authority.vendorConsents,
			authority.vendorLegitimateInterests,
			authority.purposeConsents,
			authority.purposeLegitimateInterests,
			authority.specialFeatureOptIns,
		].every(
			(map) =>
				map !== null &&
				typeof map === 'object' &&
				!Array.isArray(map) &&
				Object.values(map).every((entry) => typeof entry === 'boolean')
		)
	);
};

const applySaveAuthority = function applySaveAuthority(
	patch: SnapshotPatch,
	snapshot: ConsentSnapshot,
	authority?: KernelIABAuthority
): void {
	if (authority && snapshot.iab) {
		patch.iab = {
			...snapshot.iab,
			authority: copyIABAuthority(authority),
			tcString: authority.tcString,
		};
	}
};

/**
 * Dependencies required by `buildCommands`.
 */
export interface CommandDeps {
	runtime: KernelRuntime;
	transport: KernelTransport | undefined;
	initRetry: KernelConfig['initRetry'];
}

/**
 * Build the `kernel.commands.*` object given the kernel's runtime deps.
 */
// oxlint-disable-next-line max-lines-per-function -- Commands share retry, timer and replay state through closures.
export const buildCommands = function buildCommands(deps: CommandDeps) {
	const { runtime, transport, initRetry } = deps;
	const { getSnapshot, commit, emit } = runtime;
	const retryPolicy = resolveInitRetryPolicy(initRetry);
	const pendingSaves = transport?.save
		? createPendingSaveQueue({ emit, save: transport.save })
		: null;
	let disposed = false;
	// Bumped by every explicit `init()`. An attempt that resolves after a newer
	// init started is stale: it must not apply its response, touch retry
	// state, or start a replay. `dispose()` deliberately leaves the generation
	// alone so an in-flight init still lands when React StrictMode disposes
	// and reuses the same kernel without calling init again.
	let initGeneration = 0;
	let onlineListenerInstalled = false;
	let visibilityListenerInstalled = false;
	let pendingRetryAttempt: number | null = null;
	let retryInFlight = false;
	let retryTimer: ReturnType<typeof setTimeout> | null = null;
	// Bumped by every `identify()` so a subject read started by an earlier
	// identify cannot apply after a later one.
	let identifyGeneration = 0;

	const getBrowserWindow = function getBrowserWindow(): Window | null {
		return typeof window === 'undefined' ? null : window;
	};

	const clearRetryTimer = function clearRetryTimer(): void {
		if (retryTimer !== null) {
			clearTimeout(retryTimer);
			retryTimer = null;
		}
	};

	const removeVisibilityListener = function removeVisibilityListener(): void {
		if (
			!visibilityListenerInstalled ||
			typeof document === 'undefined' ||
			typeof document.removeEventListener !== 'function'
		) {
			return;
		}
		// oxlint-disable-next-line no-use-before-define
		document.removeEventListener('visibilitychange', onVisibilityChange);
		visibilityListenerInstalled = false;
	};

	const ensureVisibilityListener = function ensureVisibilityListener(): void {
		if (
			disposed ||
			visibilityListenerInstalled ||
			typeof document === 'undefined' ||
			typeof document.addEventListener !== 'function'
		) {
			return;
		}
		// oxlint-disable-next-line no-use-before-define
		document.addEventListener('visibilitychange', onVisibilityChange);
		visibilityListenerInstalled = true;
	};

	const isDocumentVisible = function isDocumentVisible(): boolean {
		return (
			typeof document === 'undefined' || document.visibilityState !== 'hidden'
		);
	};

	const replayPendingSaves =
		async function replayPendingSaves(): Promise<void> {
			if (disposed || !pendingSaves) {
				return;
			}
			const hasRemaining = await pendingSaves.replay();
			if (hasRemaining) {
				// oxlint-disable-next-line no-use-before-define
				ensureOnlineListener();
			}
		};

	const finishLifecycle = function finishLifecycle(
		now: number,
		activatePrivacy = true
	): void {
		if (activatePrivacy) {
			runtime.reconcilePrivacy(now);
		}
		runtime.armDeadlineTimer();
	};

	/** Finalize local init while preserving its precomputed resolution. */
	const finalizeWithoutTransport = function finalizeWithoutTransport(
		now: number
	): void {
		const patch: SnapshotPatch = { now, policyPending: false };
		if (commit(patch)) {
			emit({ snapshot: getSnapshot(), type: 'init:applied' });
		}
	};

	const runInitAttempt = async function runInitAttempt(
		attempt: number
	): Promise<InitResult> {
		emit({ type: 'command:init:started' });
		runtime.start();

		if (!transport?.init) {
			const now = runtime.now();
			finalizeWithoutTransport(now);
			finishLifecycle(now);
			const result: InitResult = { ok: true };
			emit({ result, type: 'command:init:completed' });
			void replayPendingSaves();
			return result;
		}

		const generation = initGeneration;
		const recordsGeneration = runtime.getGeneration();
		const completeSuperseded = function completeSuperseded(
			error: unknown
		): InitResult {
			const result: InitResult = { error, ok: false };
			emit({ result, type: 'command:init:completed' });
			return result;
		};

		try {
			const snapshot = getSnapshot();
			const ctx: InitContext = {
				overrides: snapshot.overrides,
				user: snapshot.user,
			};
			const response = await transport.init(ctx);
			if (generation !== initGeneration) {
				return completeSuperseded(
					new Error('c15t: init attempt superseded by a newer init()')
				);
			}
			const now = runtime.now();
			const current = getSnapshot();
			const recordsAreCurrent =
				recordsGeneration === runtime.getGeneration() &&
				snapshot.subject?.subjectId === current.subject?.subjectId &&
				snapshot.user === current.user;
			// Policy can still resolve after clear or identification changes,
			// but the old request no longer owns this subject's stored records.
			const acceptedResponse = recordsAreCurrent
				? response
				: {
						...response,
						records: undefined,
						subjectId: undefined,
					};
			const applied = applyInitResponse(current, acceptedResponse, now);
			if (applied.recordIssues && !isProduction()) {
				console.warn(
					'[c15t] Ignored invalid server records on init.',
					applied.recordIssues
				);
			}
			const changed = commit(applied.patch);
			if (changed || snapshot.policyPending) {
				emit({ snapshot: getSnapshot(), type: 'init:applied' });
			}
			finishLifecycle(now, recordsGeneration === runtime.getGeneration());
			clearRetryTimer();
			pendingRetryAttempt = null;
			removeVisibilityListener();
			const result: InitResult = { ok: true };
			emit({ result, type: 'command:init:completed' });
			void replayPendingSaves();
			return result;
		} catch (error) {
			if (generation !== initGeneration) {
				return completeSuperseded(error);
			}
			emit({ command: 'init', error, type: 'command:error' });
			const now = runtime.now();
			commit(failedResolutionPatch(getSnapshot(), now));
			finishLifecycle(now, recordsGeneration === runtime.getGeneration());
			const nextRetryMs =
				retryPolicy && attempt < retryPolicy.maxAttempts && !disposed
					? getRetryDelay(retryPolicy, attempt)
					: null;
			emit({ attempt, error, nextRetryMs, type: 'init:failed' });
			warnInitFailure(nextRetryMs);
			if (nextRetryMs !== null) {
				// oxlint-disable-next-line no-use-before-define
				scheduleRetry(attempt + 1, nextRetryMs);
			}
			const result: InitResult = { error, ok: false };
			emit({ result, type: 'command:init:completed' });
			return result;
		}
	};

	const executeRetry = async function executeRetry(
		attempt: number
	): Promise<void> {
		try {
			await runInitAttempt(attempt);
		} finally {
			retryInFlight = false;
		}
	};

	const runPendingRetry = function runPendingRetry(): void {
		if (disposed || retryInFlight || pendingRetryAttempt === null) {
			return;
		}
		if (!isDocumentVisible()) {
			ensureVisibilityListener();
			return;
		}

		const attempt = pendingRetryAttempt;
		pendingRetryAttempt = null;
		removeVisibilityListener();
		retryInFlight = true;
		void executeRetry(attempt);
	};

	const onVisibilityChange = function onVisibilityChange(): void {
		if (isDocumentVisible()) {
			runPendingRetry();
		}
	};

	const scheduleRetry = function scheduleRetry(
		attempt: number,
		delayMs: number
	): void {
		if (disposed) {
			return;
		}
		clearRetryTimer();
		pendingRetryAttempt = attempt;
		// oxlint-disable-next-line no-use-before-define
		ensureOnlineListener();
		retryTimer = setTimeout(() => {
			retryTimer = null;
			runPendingRetry();
		}, delayMs);
	};

	const onOnline = function onOnline(): void {
		if (disposed) {
			return;
		}
		void replayPendingSaves();
		if (pendingRetryAttempt !== null) {
			clearRetryTimer();
			runPendingRetry();
		}
	};

	const ensureOnlineListener = function ensureOnlineListener(): void {
		const browserWindow = getBrowserWindow();
		if (
			disposed ||
			onlineListenerInstalled ||
			!browserWindow ||
			typeof browserWindow.addEventListener !== 'function'
		) {
			return;
		}
		browserWindow.addEventListener('online', onOnline);
		onlineListenerInstalled = true;
	};

	const loadSubjectRecord = async function loadSubjectRecord(
		subjectId: string | null,
		identifyAttempt: number
	): Promise<void> {
		if (!transport?.loadSubjectRecord || !subjectId) {
			return;
		}
		// The read is bound to the subject it was requested for and to the
		// records generation at request time. A clear, a newer identify or a
		// subject switch while it was in flight makes the result stale.
		const generation = runtime.getGeneration();
		try {
			const records = await transport.loadSubjectRecord(subjectId);
			const stale =
				identifyAttempt !== identifyGeneration ||
				runtime.getGeneration() !== generation ||
				(getSnapshot().subject?.subjectId ?? null) !== subjectId;
			if (records && !stale) {
				// Newest receipt per category wins: a local refusal made while
				// the server read was in flight is never overwritten.
				const result = runtime.mergeServerRecords(records);
				if (result.ok === false) {
					emit({
						command: 'loadSubjectRecord',
						error: new Error('c15t: server record rejected by validation'),
						type: 'command:error',
					});
				}
			}
		} catch (error) {
			emit({ command: 'loadSubjectRecord', error, type: 'command:error' });
		}
	};

	/**
	 * Transport phase of a save. The outcome only touches the replay queue
	 * while this action's confirmed receipts are current. Disjoint category
	 * actions remain independent. Only the newest action can map the subject
	 * returned by the server; older outcomes cannot replace its identity.
	 */
	const sendSave = async function sendSave(
		payload: SavePayload,
		generation: number,
		confirmed: readonly OptionalConsentCategory[],
		actionSnapshot: ConsentSnapshot
	): Promise<SaveResult> {
		const currentPayload = (): SavePayload | null => {
			const current = getSnapshot();
			if (
				runtime.getGeneration() !== generation ||
				current.user !== actionSnapshot.user ||
				current.evaluationPolicy.choice.fingerprint !==
					actionSnapshot.evaluationPolicy.choice.fingerprint
			) {
				return null;
			}
			const selected = selectSavePayload(
				payload,
				(category) =>
					current.explicitChoice?.categories[category] ===
					actionSnapshot.explicitChoice?.categories[category]
			);
			if (payload.vendorChoice === undefined || !selected) {
				return selected;
			}
			// The vendor map stands or falls on its own: narrowing the category
			// receipts says nothing about it. It stays while it is still the
			// current one and goes once a newer action carried a newer map, in
			// which case a vendor-only action has nothing left to send.
			if (current.vendorChoice === actionSnapshot.vendorChoice) {
				return selected === payload
					? payload
					: { ...selected, vendorChoice: payload.vendorChoice };
			}
			const { vendorChoice: _superseded, ...remaining } = selected;
			return Object.keys(remaining.confirmed.categories).length > 0
				? remaining
				: null;
		};
		const send = transport?.save;
		if (!send) {
			return { confirmed, ok: true, subjectId: payload.subjectId };
		}
		try {
			// Yield one macrotask before the network call so the UI commit
			// from `commit()` above can paint first.
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			const sending = currentPayload();
			if (!sending) {
				return { confirmed, ok: false };
			}
			const result = await send(sending);
			const remaining = currentPayload();
			if (!remaining) {
				return { ...result, confirmed };
			}
			if (result.ok) {
				await pendingSaves?.discard(remaining);
			} else {
				await pendingSaves?.enqueue(remaining);
				ensureOnlineListener();
			}
			if (!currentPayload()) {
				return { ...result, confirmed };
			}
			if (result.ok) {
				if (
					result.subjectId &&
					result.subjectId !== getSnapshot().subject?.subjectId &&
					getSnapshot().explicitChoice === actionSnapshot.explicitChoice &&
					getSnapshot().subject?.subjectId === actionSnapshot.subject?.subjectId
				) {
					commit({
						subject: { ...getSnapshot().subject, subjectId: result.subjectId },
					});
					emit({ snapshot: getSnapshot(), type: 'subject:resolved' });
				}
				// The accepted save established or confirmed the subject: standing
				// directives recorded while anonymous can be forwarded now.
				runtime.flushPrivacy();
			}
			return { ...result, confirmed };
		} catch (error) {
			emit({ command: 'save', error, type: 'command:error' });
			const remaining = currentPayload();
			if (remaining) {
				await pendingSaves?.enqueue(remaining);
				ensureOnlineListener();
			}
			return { confirmed, ok: false };
		}
	};

	const commands = {
		dismissNotice(): Promise<NoticeDismissResult> {
			const snapshot = getSnapshot();
			if (snapshot.promptRequirement.kind !== 'notice') {
				return Promise.resolve({ ok: false, reason: 'not-required' });
			}
			const actionAt = runtime.now();
			const dismissal = {
				dismissedAt: actionAt,
				fingerprint: snapshot.evaluationPolicy.notice.fingerprint,
				version: 1 as const,
			};
			commit({ noticeDismissal: dismissal, now: actionAt });
			emit({ dismissal, snapshot: getSnapshot(), type: 'notice:dismissed' });
			runtime.armDeadlineTimer();
			return Promise.resolve({ dismissal, ok: true });
		},

		async identify(user: KernelUser): Promise<void> {
			identifyGeneration += 1;
			const attempt = identifyGeneration;
			const generation = runtime.getGeneration();
			const { subject, iab } = getSnapshot();
			const subjectId = subject?.subjectId ?? null;
			const patch: SnapshotPatch = { user: { ...user } };
			if (iab) {
				patch.iab = { ...iab, authority: null, tcString: null };
			}
			commit(patch);
			emit({ snapshot: getSnapshot(), type: 'user:identified' });
			if (transport?.identify) {
				try {
					await transport.identify({ ...user }, subjectId);
				} catch (error) {
					emit({ command: 'identify', error, type: 'command:error' });
					throw error;
				}
			}
			if (
				attempt !== identifyGeneration ||
				runtime.getGeneration() !== generation ||
				(getSnapshot().subject?.subjectId ?? null) !== subjectId
			) {
				return;
			}
			// An existing subject forwards standing directives right away;
			// without one they stay pending until a save establishes it.
			runtime.flushPrivacy();
			await loadSubjectRecord(subjectId, attempt);
		},

		init(): Promise<InitResult> {
			// An explicit init re-arms a disposed kernel. React StrictMode runs
			// effect cleanup (which disposes) and then re-mounts with the same
			// memoized kernel and calls init again; retries must work after that.
			disposed = false;
			runtime.rearm();
			initGeneration += 1;
			clearRetryTimer();
			pendingRetryAttempt = null;
			removeVisibilityListener();
			return runInitAttempt(1);
		},

		// oxlint-disable-next-line complexity -- One action records categories and vendors together in a fixed order.
		async save(
			input?: SaveInput,
			context?: {
				actionAt?: number;
				iabAuthority?: KernelIABAuthority;
				categories?: readonly AllConsentNames[];
				vendors?: Record<string, boolean>;
			}
		): Promise<SaveResult> {
			const currentTime = runtime.now();
			const actionAt =
				context?.actionAt === undefined ? currentTime : context.actionAt;
			if (!isValidSaveActionAt(actionAt, currentTime)) {
				return {
					issues: [{ code: 'invalid-timestamp', path: 'actionAt' }],
					ok: false,
				};
			}
			if (
				context?.iabAuthority !== undefined &&
				!validSaveAuthority(
					context.iabAuthority,
					getSnapshot(),
					actionAt,
					currentTime
				)
			) {
				return { ok: false };
			}
			if (
				context?.vendors !== undefined &&
				!isVendorGrantMap(context.vendors)
			) {
				return {
					issues: [{ code: 'invalid-boolean', path: 'vendors' }],
					ok: false,
				};
			}
			emit({ type: 'command:save:started' });

			const before = getSnapshot();
			// Vendor denials resolve before any early return so a vendor-only
			// toggle is recorded even when no category receipt is owed.
			const nextVendorChoice = resolveVendorSelection(
				before,
				runtime.getVendorDraft(),
				input,
				context?.vendors,
				actionAt,
				context?.categories
			);
			const vendorsChanged = nextVendorChoice !== before.vendorChoice;
			const owedNothing = saveUnderNoneRegime(before);
			if (owedNothing && !vendorsChanged) {
				// Same as the no-op branch below: a staged value the selection
				// ignored must not survive to a later save.
				runtime.setVendorDraft(null);
				emit({ result: owedNothing, type: 'command:save:completed' });
				return owedNothing;
			}
			// Captured once, before validation, yield, network or persistence.
			const uiSource = before.activeUI;
			let consentAction: SavePayload['consentAction'] = 'custom';
			let recorded: ReturnType<typeof recordCategoryPatch>;
			if (owedNothing) {
				// A `none` regime owes no category receipt; only vendors change.
				recorded = {
					choice: before.explicitChoice ?? EMPTY_CHOICE,
					confirmed: [],
					ok: true,
				};
			} else {
				const selection = resolveSaveSelection(
					before,
					runtime.getDraft(),
					input,
					context?.categories
				);
				({ consentAction } = selection);
				recorded = recordCategoryPatch(
					before.explicitChoice,
					selection.values,
					{
						actionAt,
						now: currentTime,
						policy: before.evaluationPolicy,
					}
				);
			}
			if (recorded.ok === false) {
				const result: SaveResult = { issues: recorded.issues, ok: false };
				emit({ result, type: 'command:save:completed' });
				return result;
			}
			const categoriesChanged = recorded.confirmed.length > 0;
			if (!categoriesChanged && !vendorsChanged) {
				// Nothing confirmed: no receipt, no choice event, no request, no write.
				// A staged vendor value the selection ignored (undeclared, disabled)
				// is dropped too, or a later declaration would let an unrelated save
				// apply it.
				runtime.setVendorDraft(null);
				const result: SaveResult = {
					confirmed: [],
					ok: true,
					subjectId: before.subject?.subjectId,
				};
				emit({ result, type: 'command:save:completed' });
				return result;
			}

			const subjectId = before.subject?.subjectId ?? generateSubjectId();
			const subject = saveSubject(before, subjectId);
			runtime.setDraft(null);
			runtime.setVendorDraft(null);
			const patch: SnapshotPatch = {
				now: currentTime,
				subject,
			};
			if (categoriesChanged) {
				patch.explicitChoice = recorded.choice;
			}
			if (vendorsChanged) {
				patch.vendorChoice = nextVendorChoice;
			}
			applySaveAuthority(patch, before, context?.iabAuthority);
			commit(patch);
			const after = getSnapshot();
			// Records generation at the moment the action landed. A hydration
			// boundary (storage clear, server record) that replaces the choice
			// afterwards supersedes this action: its outcome must not queue a
			// replay or touch the subject.
			const generation = runtime.getGeneration();
			// Exactly the confirmed keys with their recorded values, copied so a
			// caller mutating its input object cannot change the queued payload.
			const confirmedCategories: Partial<
				Record<OptionalConsentCategory, boolean>
			> = {};
			for (const category of recorded.confirmed) {
				const decision = recorded.choice.categories[category];
				if (decision) {
					confirmedCategories[category] = decision.value;
				}
			}
			if (categoriesChanged) {
				emit({
					actionAt,
					confirmed: recorded.confirmed,
					snapshot: after,
					type: 'choice:recorded',
				});
			}
			if (vendorsChanged) {
				emit({ actionAt, snapshot: after, type: 'vendors:recorded' });
			}
			runtime.armDeadlineTimer();

			// Built once so a queued replay records when the visitor decided,
			// not when the retry ran, and derives the same backend consent id.
			const payload: SavePayload = {
				choice: recorded.choice,
				confirmed: { actionAt, categories: confirmedCategories },
				consentAction,
				consents: after.effectivePermissions,
				...saveDecisionInputs(after),
				givenAt: actionAt,
				model: after.model,
				overrides: after.overrides,
				policySnapshotToken: after.policySnapshotToken,
				subject,
				subjectId,
				tcString: after.iab?.tcString ?? null,
				uiSource,
				user: after.user,
			};
			const vendorChoice = vendorChoicePayload(after);
			if (vendorChoice) {
				payload.vendorChoice = vendorChoice;
			}

			const result = await sendSave(
				payload,
				generation,
				recorded.confirmed,
				after
			);
			emit({ result, type: 'command:save:completed' });
			return result;
		},
	};

	const dispose = function dispose(): void {
		if (disposed) {
			return;
		}
		disposed = true;
		clearRetryTimer();
		pendingRetryAttempt = null;
		removeVisibilityListener();
		runtime.stopTimers();

		const browserWindow = getBrowserWindow();
		if (
			onlineListenerInstalled &&
			browserWindow &&
			typeof browserWindow.removeEventListener === 'function'
		) {
			browserWindow.removeEventListener('online', onOnline);
		}
		onlineListenerInstalled = false;
	};

	return { commands, dispose };
};
