/**
 * Generates the conformance fixtures in `native/protocol/`.
 *
 * Every expectation comes from the real `@c15t/core` kernel, so the Swift and
 * Kotlin cores are tested against the JavaScript implementation rather than
 * against a hand-written idea of it. Run it with:
 *
 * ```bash
 * bun run --cwd packages/react-native generate:fixtures
 * ```
 *
 * A fixture hands a client what a client actually gets, and nothing else. The
 * inputs are therefore the `/init` transport response, the records already in
 * protected storage, the overrides and privacy signals the device reports, and
 * a fixed clock. No fixture asks a core to resolve a policy pack: the backend
 * matches the pack and answers with a resolved `policyResolution` wire value,
 * which is the only thing a client ever reads.
 *
 * What lands in `native/protocol/`:
 *
 * - `evaluation-*.json` — init response plus stored records in, snapshot out.
 * - `save-body-*.json` — the same plus a commit, and the exact `POST /subjects`
 *   request (headers and body) the kernel puts on the wire.
 * - `storage-*.json` — serialized consent-record envelope round-trip: decode,
 *   re-encode, and the snapshot the decoded records produce.
 * - `index.json` — every fixture's id, kind, protocolVersion, and SHA-256, so a
 *   runner enumerates fixtures instead of hard-coding names and can prove it read
 *   the bytes this script wrote.
 *
 * Each file carries a complete `input` and a literal `expected`, so a native test
 * reads the file, applies `input`, and compares values. Nothing is re-derived.
 *
 * Determinism rules this script depends on: the clock is always an input, a save
 * is always stamped with that same clock, the subject id is always supplied
 * rather than generated, the language is always pinned, and every object here is
 * built in a fixed key order. Re-running the script must not change a byte.
 *
 * IAB TCF is out of scope: no TC string, no GVL, and the snapshot `iab` slot is
 * emitted as `null`.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	buildSubjectPostBody,
	C15T_POLICY_CONTRACT_HEADER,
	c15tProtocolHeaders,
	createConsentKernel,
	mapInitOutputToInitResponse,
	policyRulePresets,
	readPolicyResolutionWire,
	resolvePolicyRules,
	validateExplicitChoice,
	writePolicyResolutionWire,
} from '@c15t/core';
import type {
	ConsentSnapshot as KernelSnapshot,
	AllConsentNames,
	ConsentState,
	ConsentSubject,
	ExplicitChoice,
	HydrationRecords,
	InitOutput,
	JurisdictionCode,
	KernelActiveUI,
	KernelModel,
	KernelOverrides,
	KernelPrivacySignals,
	KernelTranslations,
	KernelUser,
	LocationResponse,
	NoticeDismissal,
	OptionalConsentCategory,
	PolicyResolution,
	PolicyResolutionWire,
	PolicyRule,
	PrivacyOptOut,
	PromptRequirement,
	RestrictionReason,
	SaveInput,
	SavePayload,
} from '@c15t/core';

import type { CommitIntent } from '../src/protocol/commit';
import { DEFAULT_NATIVE_LANGUAGE } from '../src/protocol/overrides';
import {
	isProtocolVersionSupported,
	PROTOCOL_VERSION,
} from '../src/protocol/version';

// -- Fixed inputs ------------------------------------------------------------

/** Evaluation clock for every fixture. Nothing here reads the wall clock. */
const NOW = 1_770_000_000_000;

/** Domain the `POST /subjects` body is built for. */
const DOMAIN = 'app.example.com';

/**
 * The subject ids fixtures replay, as UUID v4 values.
 *
 * `native/CONTRACT.md` rule 6 makes the subject id a c15t-generated UUID, and the
 * Swift core's `SubjectIdentity` refuses to load anything that is not a lowercase
 * v4 UUID: hand it `sub-eu-1` and it discards the stored identity and generates a
 * random one, so no iOS run could ever echo the id a fixture expects. The kernel
 * does not check the shape, which is exactly the kind of disagreement a
 * conformance fixture has to settle in the strict implementation's favour.
 *
 * They are constants and not generated because the expected snapshot and the
 * expected save body both carry the id, and a random one would make every
 * regeneration a diff.
 */
const SUBJECT = {
	/** The subject behind the California scenarios. */
	california: '6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c02',
	/** The subject behind the Europe and storage scenarios. */
	europe: '6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c01',
	/** The subject with an active GPC signal. */
	gpc: '6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c03',
	/** The subject on the no-match rule. */
	noMatch: '6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c04',
	/** The subject on the notice-only rule. */
	notice: '6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c05',
	/** The subject whose envelope carries an unreadable receipt. */
	storageInvalid: '6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c07',
	/** The subject whose envelope carries a partial grant. */
	storagePartial: '6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c06',
	/** Fallback when a stored envelope names no subject at all. */
	unattributed: '6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c08',
} as const;

/**
 * The policy contract this build declares and reads, as the header string.
 *
 * Read from the kernel rather than hard-coded so a fixture can never pin a
 * contract the code it generates against has already moved past.
 */
const CONTRACT_HEADER_VALUE = c15tProtocolHeaders[C15T_POLICY_CONTRACT_HEADER];

/**
 * The translation bundle `/init` serves.
 *
 * A partial bundle, which is what the backend serves when a project overrides
 * only part of the copy. It is pinned because a snapshot carries the bundle
 * through untouched: a fixture that let it vary could not tell a carried bundle
 * from a rebuilt one.
 */
const TRANSLATIONS: KernelTranslations = {
	language: DEFAULT_NATIVE_LANGUAGE,
	translations: {
		common: {
			acceptAll: 'Accept all',
			customize: 'Customize',
			rejectAll: 'Reject all',
			save: 'Save',
		},
		consentManagerDialog: {},
		consentTypes: {},
		cookieBanner: {},
		rights: {},
	},
};

/** The configured policy pack most scenarios resolve against. */
const POLICY_RULES: readonly PolicyRule[] = [
	policyRulePresets.europeOptIn(),
	policyRulePresets.californiaOptOut(),
];

/**
 * Notice-only rule for the dismissal pair. It lives here rather than in a
 * preset because the fixture needs a `notice` prompt, and no shipped preset
 * uses one.
 */
const NOTICE_RULE: PolicyRule = {
	categories: ['marketing', 'measurement'],
	id: 'fixture_notice_only',
	match: { countries: ['GB'] },
	model: 'opt-out',
	prompt: 'notice',
	scopeMode: 'strict',
	validity: { noticeDays: 180 },
};

// -- Emitted shapes ----------------------------------------------------------

/** The `/init` body, exactly as the backend writes it. */
type InitResponseBody = InitOutput;

/**
 * The `/init` response to serve: status, the producer's contract declaration,
 * and the body. A native runner answers its transport with these three values
 * and nothing else, so the header negotiation is under test too.
 */
interface InitTransport {
	status: 200;
	headers: Record<string, string>;
	body: InitResponseBody;
}

/** Overrides the app pins, before `/init` resolved anything. */
interface FixtureOverrides {
	country: string | null;
	gpc: boolean | null;
	language: string | null;
	region: string | null;
}

/**
 * Privacy signals as the device reports them.
 *
 * `detected` is the platform signal and `override` the app's explicit setting;
 * `null` means the host has no answer to give. `active`, which is what the
 * evaluator honors, is derived from the two, so it appears in `expected` and
 * never in an input.
 */
interface FixturePrivacySignals {
	gpc: { detected: boolean | null; override: boolean | null };
}

/** The explainability half of a policy resolution, as a snapshot carries it. */
interface FixtureResolution {
	fingerprint: string | null;
	policyId: string | null;
	status: PolicyResolution['status'];
}

/**
 * The snapshot a native core must produce.
 *
 * The kernel snapshot restricted to the fields that matter on device, plus the
 * two lifecycle flags the kernel does not model (`ready`, `error`) and the
 * reserved `iab` slot held as `null`. `overrides` and `privacySignals` are the
 * kernel's own shapes, which is what "Corrections to this contract" in
 * `native/CONTRACT.md` settles: there is no `test` override and no `msa` signal,
 * and GPC is a `detected` / `override` / `active` triple rather than one boolean.
 */
interface FixtureSnapshot {
	readonly activeUI: KernelActiveUI;
	readonly consentCategories: readonly AllConsentNames[] | null;
	readonly effectivePermissions: ConsentState;
	readonly error: { code: string; message: string } | null;
	readonly evaluatedAt: number;
	readonly explicitChoice: ExplicitChoice | null;
	readonly iab: null;
	readonly location: LocationResponse | null;
	readonly model: Exclude<KernelModel, 'iab'>;
	readonly nextDeadline: number | null;
	readonly optOutDirectives: readonly PrivacyOptOut[];
	readonly overrides: FixtureOverrides;
	readonly policyPending: boolean;
	readonly policySnapshotToken: string | null;
	readonly privacySignals: KernelPrivacySignals;
	readonly promptRequirement: PromptRequirement;
	readonly ready: boolean;
	readonly resolution: FixtureResolution;
	readonly restrictions: Partial<
		Record<OptionalConsentCategory, readonly RestrictionReason[]>
	>;
	readonly revision: number;
	readonly subject: ConsentSubject | null;
	readonly translations: KernelTranslations | null;
}

/** What protected storage holds before the core starts, `null` meaning absent. */
interface StoredRecords {
	subject: ConsentSubject | null;
	choice: ExplicitChoice | null;
	noticeDismissal: NoticeDismissal | null;
}

/**
 * The state a fixture replays: everything a native core has to work with before
 * the asserted step runs, in the form a client receives it.
 */
interface FixtureInput {
	/** Evaluation clock. Every timestamp in `expected` is derived from it. */
	now: number;
	/** Whether hydration completed before the step under test. Maps to `ready`. */
	hydrated: boolean;
	/** The `/init` response to serve, verbatim. */
	transport: InitTransport;
	/** Records already in protected storage. */
	storedRecords: StoredRecords;
	/** Overrides the app pinned, before `/init` resolved anything. */
	overrides: FixtureOverrides;
	/** Privacy signals the device reports, before `/init` resolved anything. */
	privacySignals: FixturePrivacySignals;
	/** Identified user, when the app has one. */
	user: KernelUser | null;
}

interface EvaluationFixture {
	protocolVersion: number;
	kind: 'evaluation';
	id: string;
	description: string;
	notes: string[];
	input: FixtureInput;
	expected: {
		snapshot: FixtureSnapshot;
	};
}

interface SaveBodyFixture {
	protocolVersion: number;
	kind: 'save-body';
	id: string;
	description: string;
	notes: string[];
	input: FixtureInput & {
		/** Confirmation time for the commit. Always `input.now`. */
		actionAt: number;
		domain: string;
		intent: CommitIntent;
	};
	expected: {
		snapshotBefore: FixtureSnapshot;
		snapshotAfter: FixtureSnapshot;
		savePayload: SavePayload;
		request: {
			method: 'POST';
			path: string;
			headers: Record<string, string>;
			body: unknown;
		};
	};
}

interface StorageFixture {
	protocolVersion: number;
	kind: 'storage';
	id: string;
	description: string;
	notes: string[];
	input: FixtureInput & { storedEnvelope: string };
	expected: {
		decode:
			| { ok: true; records: { subject: unknown; choice: unknown } }
			| { ok: false; issues: unknown };
		reEncoded: string | null;
		snapshot: FixtureSnapshot;
	};
}

type Fixture = EvaluationFixture | SaveBodyFixture | StorageFixture;

/** What a scenario holds that a client never sees. */
interface Scenario {
	/**
	 * Policy pack the producer serves. The backend matches it and answers with a
	 * resolution, so it appears in no fixture: a client cannot resolve a pack.
	 */
	policyRules: readonly PolicyRule[];
	/** Geo the backend resolved for this request. Reaches the client as `location`. */
	geo: { country: string | null; region: string | null };
	/** Jurisdiction code the backend reports for that geo. */
	jurisdiction: JurisdictionCode;
	/** Privacy signals the device reports for this subject. */
	gpc: boolean;
	/** Pinned language, so translation selection never varies. */
	language: string;
	/** Signed policy token the init response carried, when it carried one. */
	policySnapshotToken: string | null;
	/** Records already in protected storage. */
	storedRecords: StoredRecords;
	/** Identified user, when the app has one. */
	user: KernelUser | null;
}

// -- Transport and record plumbing ------------------------------------------

/** Resolve the pack the way the producer does, then put it on the wire. */
const resolutionWireFor = function resolutionWireFor(
	scenario: Scenario
): PolicyResolutionWire {
	return writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: scenario.geo.country,
			regionCode: scenario.geo.region,
			rules: [...scenario.policyRules],
		})
	);
};

/**
 * The `/init` body for a scenario, built in a fixed key order.
 *
 * `policySnapshotToken` is omitted rather than sent as null, because that is
 * what the backend does when snapshot tokens are not configured, and the schema
 * draws the distinction.
 */
const initBodyFor = function initBodyFor(scenario: Scenario): InitResponseBody {
	const body: InitResponseBody = {
		branding: 'c15t',
		jurisdiction: scenario.jurisdiction,
		location: {
			countryCode: scenario.geo.country,
			regionCode: scenario.geo.region,
		},
		policyResolution: resolutionWireFor(scenario),
		translations: TRANSLATIONS,
	};
	// Omitted rather than nulled: the field is absent on a real /init that has
	// nothing to snapshot, and a fixture must not invent the key.
	return scenario.policySnapshotToken === null
		? body
		: { ...body, policySnapshotToken: scenario.policySnapshotToken };
};

const transportFor = function transportFor(
	body: InitResponseBody
): InitTransport {
	return {
		body,
		// A negotiated producer declares its contract on the response. Without this
		// header every client treats the body as pre-contract and fails closed, so
		// the fixtures that carry a policy have to declare it.
		headers: { [C15T_POLICY_CONTRACT_HEADER]: CONTRACT_HEADER_VALUE },
		status: 200,
	};
};

const inputFor = function inputFor(
	scenario: Scenario,
	options: { records?: StoredRecords } = {}
): FixtureInput {
	return {
		hydrated: true,
		now: NOW,
		// The app pins a language and nothing else: geo is what the backend resolves,
		// and it reaches the client as `init.location`.
		overrides: {
			country: null,
			gpc: null,
			language: scenario.language,
			region: null,
		},
		privacySignals: { gpc: { detected: scenario.gpc, override: null } },
		storedRecords: options.records ?? scenario.storedRecords,
		transport: transportFor(initBodyFor(scenario)),
		user: scenario.user,
	};
};

/**
 * Map stored records onto the kernel's hydration boundary.
 *
 * Absent members are omitted rather than sent as `undefined`, which is how the
 * kernel distinguishes "nothing stored" from a record it must validate.
 */
const hydrationFor = function hydrationFor(
	records: StoredRecords
): HydrationRecords {
	const hydrated: HydrationRecords = { now: NOW };
	if (records.choice !== null) {
		hydrated.choice = records.choice;
	}
	if (records.noticeDismissal !== null) {
		hydrated.noticeDismissal = records.noticeDismissal;
	}
	if (records.subject !== null) {
		hydrated.subject = records.subject;
	}
	return hydrated;
};

// -- Kernel harness ---------------------------------------------------------

/**
 * Map a commit intent onto the input the kernel's save command accepts.
 *
 * `necessary` is a reject-all here: the prompt offers it as "only necessary",
 * and the kernel records an explicit false for every category in scope.
 */
const saveInputFor = function saveInputFor(intent: CommitIntent): SaveInput {
	if (intent.action === 'all') {
		return 'all';
	}
	return intent.action === 'necessary' ? 'none' : intent.consents;
};

/**
 * Replay a fixture input against the real kernel.
 *
 * The policy arrives the way it arrives on device: through the init command, fed
 * by the transport response in the input. Nothing is injected at construction,
 * so the revision numbering and the override fold in `expected` are the ones a
 * client actually observes.
 */
const runFixture = async function runFixture(
	input: FixtureInput,
	options: {
		/** Dismiss the current notice before the snapshot is read. */
		dismiss?: boolean;
		intent?: CommitIntent;
		actionAt?: number;
	} = {}
): Promise<{
	before: KernelSnapshot;
	after: KernelSnapshot;
	payload: SavePayload | null;
}> {
	const response = mapInitOutputToInitResponse(
		input.transport.body,
		{},
		{
			producerContract: Number(CONTRACT_HEADER_VALUE),
		}
	);
	const payloads: SavePayload[] = [];
	const initialOverrides: KernelOverrides = {
		language: input.overrides.language ?? DEFAULT_NATIVE_LANGUAGE,
	};
	if (input.overrides.gpc !== null) {
		initialOverrides.gpc = input.overrides.gpc;
	}
	const kernel = createConsentKernel({
		initialOverrides,
		initialPolicyPending: true,
		initialPrivacySignals: { gpc: input.privacySignals.gpc.detected ?? false },
		initialRecords: hydrationFor(input.storedRecords),
		initialUser: input.user ?? undefined,
		now: input.now,
		transport: {
			init: () => Promise.resolve(response),
			save: (payload) => {
				payloads.push(payload);
				return Promise.resolve({ ok: true, subjectId: payload.subjectId });
			},
		},
	});
	await kernel.commands.init();
	const before = kernel.getSnapshot();
	let payload: SavePayload | null = null;
	if (options.intent) {
		await kernel.commands.save(saveInputFor(options.intent), {
			actionAt: options.actionAt ?? input.now,
		});
		payload = payloads[0] ?? null;
	}
	if (options.dismiss) {
		await kernel.commands.dismissNotice();
	}
	const after = kernel.getSnapshot();
	kernel.dispose();
	if (after.model === 'iab' || before.model === 'iab') {
		throw new Error('Fixture produced an IAB model, which is out of scope.');
	}
	return { after, before, payload };
};

// -- Projection -------------------------------------------------------------

const NOTES = [
	'Compare parsed values, not serialized bytes: object key order is not part of the contract.',
	'transport is the /init response to serve, headers included. Answer it once, before any save.',
	'storedRecords is what protected storage holds before the core starts. A null member means nothing is stored for it. The subject id is always supplied, never generated, so no fixture depends on a random uuid.',
	'input.overrides and input.privacySignals are what the device reports. expected.overrides and expected.privacySignals are what the kernel settled: init.location sets country and region, init.translations sets language, and privacySignals.gpc.active is the override when set, otherwise the detection.',
	'there is no test override and no msa signal. Overrides are country, region, language, and gpc; gpc is a detected / override / active triple. See "Corrections to this contract" in native/CONTRACT.md.',
	'revision is a monotonic counter that starts at 0 and bumps once per committed mutation. It is not a count of the steps a runner took: an active privacy signal commits a standing directive during init, so that fixture is already at 2 after init where the others reach 1. Compare it as a number, and read the pinned value rather than deriving it.',
	'optOutDirectives holds the standing directives the kernel recorded, each with source, categories, and recordedAt. It is not always empty: a fixture with an active privacy signal carries the directive that signal produced, and recordedAt equals input.now.',
	'evaluatedAt equals input.now, and ready equals input.hydrated. Both are native lifecycle facts, not kernel output.',
	'error is null in every fixture: no fixture exercises a transport failure or an unreadable wire.',
	'Any field this file does not mention must not be invented. Unknown wire values fail closed.',
];

/**
 * Project a kernel snapshot onto the shape a native core must produce.
 *
 * This is the mapping the native cores implement, written down once so the
 * fixtures and the TypeScript side cannot drift apart. `ready` and `error` are
 * native lifecycle facts the kernel does not model, so the caller supplies
 * `hydrated` and the error stays `null` for every fixture here.
 */
/**
 * Spell every override member out.
 *
 * The kernel omits an override it never received, and a snapshot must not depend
 * on whether a key is absent or present-but-null: a reader that defaults a
 * missing member is a reader that invents a value.
 */
const fixtureOverrides = function fixtureOverrides(
	overrides: KernelOverrides
): FixtureOverrides {
	return {
		country: overrides.country ?? null,
		gpc: overrides.gpc ?? null,
		language: overrides.language ?? null,
		region: overrides.region ?? null,
	};
};

/** The signals verbatim, in a fixed key order. */
const fixturePrivacySignals = function fixturePrivacySignals(
	signals: KernelPrivacySignals
): KernelPrivacySignals {
	return {
		gpc: {
			active: signals.gpc.active,
			detected: signals.gpc.detected,
			override: signals.gpc.override ?? null,
		},
	};
};

/**
 * A standing privacy directive, in a fixed key order.
 *
 * The kernel records one when a privacy signal goes active, and it outlives the
 * signal: `optOutDirectives` is the record, `privacySignals.gpc` is the live
 * reading. The contract's first draft said this array is always empty on mobile,
 * which the kernel contradicts, so the fixture carries what the kernel holds and
 * a native core that drops it will show up as a mismatch rather than a silent
 * agreement.
 */
const fixtureDirective = function fixtureDirective(
	directive: PrivacyOptOut
): PrivacyOptOut {
	return {
		categories: [...directive.categories],
		recordedAt: directive.recordedAt,
		source: directive.source,
	};
};

const fixtureResolution = function fixtureResolution(
	resolution: PolicyResolution
): FixtureResolution {
	return {
		fingerprint:
			resolution.status === 'matched' ? resolution.fingerprints.policy : null,
		policyId: resolution.status === 'matched' ? resolution.policyId : null,
		status: resolution.status,
	};
};

const toFixtureSnapshot = function toFixtureSnapshot(
	snapshot: KernelSnapshot,
	hydrated: boolean
): FixtureSnapshot {
	const { overrides } = snapshot;
	const { resolution } = snapshot;
	return {
		activeUI: snapshot.activeUI,
		consentCategories: snapshot.consentCategories
			? [...snapshot.consentCategories]
			: null,
		effectivePermissions: { ...snapshot.effectivePermissions },
		error: null,
		evaluatedAt: snapshot.evaluatedAt,
		explicitChoice: snapshot.explicitChoice
			? structuredClone(snapshot.explicitChoice)
			: null,
		iab: null,
		location: snapshot.location ? { ...snapshot.location } : null,
		model: snapshot.model,
		nextDeadline: snapshot.nextDeadline,
		optOutDirectives: snapshot.optOutDirectives.map(fixtureDirective),
		overrides: fixtureOverrides(overrides),
		policyPending: snapshot.policyPending,
		policySnapshotToken: snapshot.policySnapshotToken,
		privacySignals: fixturePrivacySignals(snapshot.privacySignals),
		promptRequirement: { ...snapshot.promptRequirement },
		ready: hydrated,
		resolution: fixtureResolution(resolution),
		restrictions: { ...snapshot.restrictions },
		revision: snapshot.revision,
		subject: snapshot.subject ? { ...snapshot.subject } : null,
		translations: snapshot.translations
			? {
					language: snapshot.translations.language,
					translations: snapshot.translations.translations,
				}
			: null,
	};
};

// -- Scenarios --------------------------------------------------------------

const storedFor = function storedFor(
	subjectId: string,
	extras: { choice?: ExplicitChoice; noticeDismissal?: NoticeDismissal } = {}
): StoredRecords {
	return {
		choice: extras.choice ?? null,
		noticeDismissal: extras.noticeDismissal ?? null,
		subject: { subjectId },
	};
};

const EU_SCENARIO: Scenario = {
	geo: { country: 'DE', region: null },
	gpc: false,
	jurisdiction: 'GDPR',
	language: DEFAULT_NATIVE_LANGUAGE,
	policyRules: POLICY_RULES,
	policySnapshotToken: 'tok-europe-opt-in',
	storedRecords: storedFor(SUBJECT.europe),
	user: null,
};

const CCPA_SCENARIO: Scenario = {
	geo: { country: 'US', region: 'CA' },
	gpc: false,
	jurisdiction: 'CCPA',
	language: DEFAULT_NATIVE_LANGUAGE,
	policyRules: POLICY_RULES,
	policySnapshotToken: 'tok-california-opt-out',
	storedRecords: storedFor(SUBJECT.california),
	user: null,
};

const GPC_SCENARIO: Scenario = {
	...CCPA_SCENARIO,
	gpc: true,
	storedRecords: storedFor(SUBJECT.gpc),
};

/** Only the California rule is configured, so Germany matches nothing. */
const NO_MATCH_SCENARIO: Scenario = {
	geo: { country: 'DE', region: 'BE' },
	gpc: false,
	jurisdiction: 'GDPR',
	language: DEFAULT_NATIVE_LANGUAGE,
	policyRules: [policyRulePresets.californiaOptOut()],
	policySnapshotToken: null,
	storedRecords: storedFor(SUBJECT.noMatch),
	user: null,
};

const NOTICE_SCENARIO: Scenario = {
	geo: { country: 'GB', region: null },
	gpc: false,
	jurisdiction: 'UK_GDPR',
	language: DEFAULT_NATIVE_LANGUAGE,
	policyRules: [NOTICE_RULE],
	policySnapshotToken: 'tok-notice-only',
	storedRecords: storedFor(SUBJECT.notice),
	user: null,
};

// -- Fixtures ---------------------------------------------------------------

const evaluationFixture = function evaluationFixture(
	id: string,
	description: string,
	input: FixtureInput,
	snapshot: KernelSnapshot
): EvaluationFixture {
	return {
		description,
		expected: { snapshot: toFixtureSnapshot(snapshot, input.hydrated) },
		id: `evaluation-${id}`,
		input,
		kind: 'evaluation',
		notes: NOTES,
		protocolVersion: PROTOCOL_VERSION,
	};
};

const buildEvaluationFixtures =
	async function buildEvaluationFixtures(): Promise<EvaluationFixture[]> {
		const cases: {
			id: string;
			description: string;
			scenario: Scenario;
		}[] = [
			{
				description:
					'Germany resolves the Europe opt-in rule. With no stored choice every optional category is denied and a choice prompt is owed, so the banner is the surface to render.',
				id: 'eu-opt-in',
				scenario: EU_SCENARIO,
			},
			{
				description:
					'California resolves the CCPA opt-out rule. Optional categories are allowed until denied, no prompt is owed, and no surface renders.',
				id: 'us-ccpa-opt-out',
				scenario: CCPA_SCENARIO,
			},
			{
				description:
					'Germany with only the California rule configured resolves to no-match. The evaluator falls back to the safe opt-in rule, denies every optional category, and still reports a rule the user can be shown.',
				id: 'no-rule-matched',
				scenario: NO_MATCH_SCENARIO,
			},
			{
				description:
					'An active GPC signal under the CCPA opt-out rule denies marketing and measurement even though the model would allow them, and records the reason on the snapshot.',
				id: 'gpc-signal-present',
				scenario: GPC_SCENARIO,
			},
			{
				description:
					'A notice-only rule with no stored dismissal still owes the notice, so the banner renders and permissions follow the opt-out default.',
				id: 'notice-pending',
				scenario: NOTICE_SCENARIO,
			},
		];
		const fixtures: EvaluationFixture[] = [];
		// One kernel per case, run to completion before the next. The cases share a
		// pinned Date.now, so overlapping them would let one case's async work land
		// inside another's and make the expectations depend on scheduling.
		/* oxlint-disable no-await-in-loop -- sequential on purpose, see above */
		for (const testCase of cases) {
			const input = inputFor(testCase.scenario);
			const { after } = await runFixture(input);
			fixtures.push(
				evaluationFixture(testCase.id, testCase.description, input, after)
			);
		}

		// A stored grant and a stored partial denial are the two records a real
		// second launch brings back. They come from the real save command, so the
		// receipt fingerprints and confirmation times are the core's own.
		const granted = await runFixture(inputFor(EU_SCENARIO), {
			intent: { action: 'all' },
		});
		const grantInput = inputFor(EU_SCENARIO, {
			records: storedFor(SUBJECT.europe, {
				choice: granted.after.explicitChoice ?? null,
			}),
		});
		const replayedGrant = await runFixture(grantInput);
		fixtures.push(
			evaluationFixture(
				'eu-explicit-grants',
				'The same Europe opt-in rule on a second launch, with a stored accept-all. The receipts carry the rule choice fingerprint, every optional category is allowed, and nothing is owed, so no surface renders.',
				grantInput,
				replayedGrant.after
			)
		);

		const partial = await runFixture(inputFor(EU_SCENARIO), {
			intent: {
				action: 'explicit',
				consents: { marketing: false, measurement: true },
			},
		});
		const partialInput = inputFor(EU_SCENARIO, {
			records: storedFor(SUBJECT.europe, {
				choice: partial.after.explicitChoice ?? null,
			}),
		});
		const replayedPartial = await runFixture(partialInput);
		fixtures.push(
			evaluationFixture(
				'eu-partial-denials',
				'A stored partial choice under the Europe opt-in rule keeps absent categories absent. Measurement carries the stored grant, marketing carries the stored denial, and functionality and experience take the opt-in default rather than an invented value.',
				partialInput,
				replayedPartial.after
			)
		);

		// The dismissal has to come from the real command so its fingerprint and
		// timestamp are the core's, not a hand-written guess. The second run then
		// replays that record through hydration, which is what a relaunch does.
		const undismissed = await runFixture(inputFor(NOTICE_SCENARIO), {
			dismiss: true,
		});
		const dismissedInput = inputFor(NOTICE_SCENARIO, {
			records: storedFor(SUBJECT.notice, {
				noticeDismissal: undismissed.after.noticeDismissal ?? null,
			}),
		});
		const dismissed = await runFixture(dismissedInput);
		fixtures.push(
			evaluationFixture(
				'notice-dismissed',
				'The same notice-only rule after the notice was dismissed: the dismissal record is honoured, no interaction is owed, no surface renders, and permissions are unchanged from the undismissed run.',
				dismissedInput,
				dismissed.after
			)
		);
		return fixtures;
	};

const SAVE_NOTES = [
	...NOTES,
	'savePayload is what the pending queue must persist before the request, byte-for-byte, and a replay must resend it unchanged after a later init changes policy.',
	'request.headers must carry the policy contract declaration with exactly this value. x-c15t-version is platform telemetry and is deliberately not pinned.',
	'request.body is the POST /subjects body. tcString is absent because IAB is out of scope: never add the key.',
	'the commit happens at input.now, so givenAt, every confirmedAt, and snapshotAfter.evaluatedAt all equal it.',
	'snapshotBefore is the snapshot after init and before the commit, and snapshotAfter is the snapshot the commit leaves behind. Both are asserted.',
	'consentAction and uiSource come from the kernel, not from the intent name: a partial save is custom even when the user turned everything on.',
];

const buildSaveBodyFixtures = async function buildSaveBodyFixtures(): Promise<
	SaveBodyFixture[]
> {
	const cases: {
		id: string;
		description: string;
		scenario: Scenario;
		intent: CommitIntent;
	}[] = [
		{
			description:
				'Accept all under the Europe opt-in rule. The receipts carry the choice fingerprint, the payload confirms exactly the four optional categories, and the wire body sends both the complete preference map and the receipts for this act.',
			id: 'all',
			intent: { action: 'all' },
			scenario: EU_SCENARIO,
		},
		{
			description:
				'Reject all under the Europe opt-in rule. Necessary stays permitted, every optional category gets an explicit false receipt, and no optional category is left undecided.',
			id: 'necessary',
			intent: { action: 'necessary' },
			scenario: EU_SCENARIO,
		},
		{
			description:
				'An explicit partial save under the Europe opt-in rule confirms only marketing and measurement. Functionality and experience get no receipt, so the kernel must not renew or invent them, and consentAction is custom.',
			id: 'explicit-partial',
			intent: {
				action: 'explicit',
				consents: { marketing: true, measurement: false },
			},
			scenario: EU_SCENARIO,
		},
		{
			description:
				'Accept all under the CCPA opt-out rule while GPC is active. The receipts record the grant the subject made, while the effective permissions and the decision inputs carry the GPC denial, so the backend sees both facts.',
			id: 'ccpa-gpc',
			intent: { action: 'all' },
			scenario: GPC_SCENARIO,
		},
	];
	const fixtures: SaveBodyFixture[] = [];
	// Sequential for the same reason as the evaluation cases: one kernel at a
	// time against the pinned clock.
	/* oxlint-disable no-await-in-loop -- sequential on purpose, see above */
	for (const testCase of cases) {
		const input = inputFor(testCase.scenario);
		const { after, before, payload } = await runFixture(input, {
			actionAt: input.now,
			intent: testCase.intent,
		});
		if (!payload) {
			throw new Error(`No save payload captured for ${testCase.id}.`);
		}
		fixtures.push({
			description: testCase.description,
			expected: {
				request: {
					body: buildSubjectPostBody(payload, { domain: DOMAIN }),
					headers: { [C15T_POLICY_CONTRACT_HEADER]: CONTRACT_HEADER_VALUE },
					method: 'POST',
					path: '/subjects',
				},
				savePayload: payload,
				snapshotAfter: toFixtureSnapshot(after, input.hydrated),
				snapshotBefore: toFixtureSnapshot(before, input.hydrated),
			},
			id: `save-body-${testCase.id}`,
			input: {
				...input,
				actionAt: input.now,
				domain: DOMAIN,
				intent: testCase.intent,
			},
			kind: 'save-body',
			notes: SAVE_NOTES,
			protocolVersion: PROTOCOL_VERSION,
		});
	}
	return fixtures;
};

/** Serialized v3 consent-record envelope, in the field order the codec emits. */
interface StoredEnvelope {
	categories: unknown;
	subject?: Record<string, string>;
	version: 3;
}

const encodeEnvelope = function encodeEnvelope(
	envelope: StoredEnvelope
): string {
	return JSON.stringify({
		categories: envelope.categories,
		subject: envelope.subject,
		version: 3,
	});
};

const STORAGE_NOTES = [
	...NOTES,
	'storedEnvelope is the exact string read from protected storage. Decoding it must yield expected.decode, and re-encoding that record must produce expected.reEncoded: the same string, with version, subject, and categories in that order and categories in functionality, experience, measurement, marketing order.',
	'expected.decode.records is what feeds the hydration boundary. Hydration never creates a choice and never re-stamps a confirmation time.',
	'storedRecords mirrors the decoded envelope, so a runner can reach the snapshot without a codec of its own. When decode fails, storedRecords is what is left, which is nothing.',
	'When decode fails, apply nothing and keep the in-memory records. expected.snapshot is the deny-all snapshot, not a guess at what the bytes meant.',
];

const buildStorageFixtures = async function buildStorageFixtures(): Promise<
	StorageFixture[]
> {
	const grants = await runFixture(inputFor(EU_SCENARIO), {
		intent: { action: 'all' },
	});
	if (!grants.payload) {
		throw new Error('No save payload captured for the grants fixture.');
	}
	const partial = await runFixture(inputFor(EU_SCENARIO), {
		intent: {
			action: 'explicit',
			consents: { marketing: false, measurement: true },
		},
	});
	if (!partial.payload) {
		throw new Error('No save payload captured for the partial fixture.');
	}

	const cases: {
		id: string;
		description: string;
		envelope: StoredEnvelope;
		scenario: Scenario;
	}[] = [
		{
			description:
				'A complete opt-in grant round-trips: four receipts with the Europe choice fingerprint decode, hydrate, and re-encode to the same string, and the snapshot shows every optional category allowed with no prompt owed.',
			envelope: {
				categories: grants.payload.choice.categories,
				subject: { subjectId: SUBJECT.europe },
				version: 3,
			},
			id: 'explicit-grants',
			scenario: EU_SCENARIO,
		},
		{
			description:
				'A partial stored record keeps absent categories absent. Measurement is allowed, marketing is denied, functionality and experience take the opt-in default, and re-encoding must not write the categories the subject never touched.',
			envelope: {
				categories: partial.payload.choice.categories,
				subject: { subjectId: SUBJECT.storagePartial },
				version: 3,
			},
			id: 'partial-denials',
			scenario: {
				...EU_SCENARIO,
				storedRecords: storedFor(SUBJECT.storagePartial),
			},
		},
	];
	const readable: StorageFixture[] = [];
	for (const testCase of cases) {
		const serialized = encodeEnvelope(testCase.envelope);
		const decoded = validateExplicitChoice(JSON.parse(serialized), NOW);
		if (!decoded.ok) {
			throw new Error(
				`${testCase.id} failed to decode: ${JSON.stringify(decoded.issues)}`
			);
		}
		const input = {
			...inputFor(testCase.scenario, {
				records: storedFor(
					testCase.envelope.subject?.subjectId ?? SUBJECT.unattributed,
					{ choice: decoded.record }
				),
			}),
			storedEnvelope: serialized,
		};
		const { after } = await runFixture(input);
		const reEncoded = encodeEnvelope({
			categories: decoded.record.categories,
			subject: testCase.envelope.subject,
			version: 3,
		});
		if (reEncoded !== serialized) {
			throw new Error(
				`${testCase.id} did not round-trip: ${serialized} became ${reEncoded}`
			);
		}
		readable.push({
			description: testCase.description,
			expected: {
				decode: {
					ok: true,
					records: {
						choice: decoded.record,
						subject: testCase.envelope.subject ?? null,
					},
				},
				reEncoded: serialized,
				snapshot: toFixtureSnapshot(after, input.hydrated),
			},
			id: `storage-${testCase.id}`,
			input,
			kind: 'storage',
			notes: STORAGE_NOTES,
			protocolVersion: PROTOCOL_VERSION,
		});
	}

	// A stored envelope whose confirmation time is in the future must fail
	// closed: nothing is applied, and the snapshot is the deny-all one.
	const brokenEnvelope: StoredEnvelope = {
		categories: {
			marketing: {
				basis: { fingerprint: 'fp-europe-choice', kind: 'choice-v1' },
				confirmedAt: NOW + 60_000,
				value: true,
			},
		},
		subject: { subjectId: SUBJECT.storageInvalid },
		version: 3,
	};
	const brokenSerialized = encodeEnvelope(brokenEnvelope);
	const brokenDecoded = validateExplicitChoice(
		JSON.parse(brokenSerialized),
		NOW
	);
	if (brokenDecoded.ok) {
		throw new Error('A future confirmation time must not decode.');
	}
	const brokenInput = {
		...inputFor(EU_SCENARIO, { records: storedFor(SUBJECT.storageInvalid) }),
		storedEnvelope: brokenSerialized,
	};
	const broken = await runFixture(brokenInput);
	const fixtures: StorageFixture[] = [...readable];
	fixtures.push({
		description:
			'A stored receipt confirmed in the future is unreadable. The decode fails, no record is applied, and the snapshot is the deny-all opt-in one with a choice prompt still owed.',
		expected: {
			decode: { issues: brokenDecoded.issues, ok: false },
			reEncoded: null,
			snapshot: toFixtureSnapshot(broken.after, brokenInput.hydrated),
		},
		id: 'storage-invalid-record',
		input: brokenInput,
		kind: 'storage',
		notes: STORAGE_NOTES,
		protocolVersion: PROTOCOL_VERSION,
	});
	return fixtures;
};

// -- Guards -----------------------------------------------------------------

/** Name of the index a native runner enumerates. */
const INDEX_FILE = 'index.json';

/**
 * Refuse to write a fixture whose protocolVersion is not the one this package
 * speaks.
 *
 * A fixture written against a protocol the installed code no longer reads is
 * worse than no fixture: two native cores would faithfully implement a wire the
 * JavaScript layer rejects, and the conformance suite would green-light it.
 *
 * Three ways that happens, all refused here:
 *
 * 1. A builder stamps something other than `PROTOCOL_VERSION`. Every builder takes
 *    it from the same import today, so this is the guard rail that keeps it that
 *    way when someone adds a per-fixture or hard-coded version.
 * 2. The version this run states is outside the range the installed package
 *    accepts, which is what happens when `PROTOCOL_VERSION` moves and
 *    `MAX_SUPPORTED_PROTOCOL_VERSION` does not follow.
 * 3. The fixtures already on disk were written for a different protocol. That is
 *    the accident that actually occurs: `PROTOCOL_VERSION` changes in a commit,
 *    nobody regenerates, and Swift and Kotlin keep passing against expectations
 *    derived under the old handshake. Re-stamping is not automatic, because a
 *    silent relabel would present old expectations as new. Pass
 *    `--allow-protocol-change` once the protocol really has moved.
 */
const assertProtocolVersions = function assertProtocolVersions(
	fixtures: readonly Fixture[],
	outDir: string,
	allowProtocolChange: boolean
): void {
	const offenders = fixtures.filter(
		(fixture) => fixture.protocolVersion !== PROTOCOL_VERSION
	);
	if (offenders.length > 0) {
		const listed = offenders
			.map(
				(fixture) =>
					`${fixture.id}=${String(fixture.protocolVersion)}/${String(PROTOCOL_VERSION)}`
			)
			.join(', ');
		throw new Error(
			`Fixture protocolVersion does not match PROTOCOL_VERSION (${String(PROTOCOL_VERSION)}): ${listed}. Regenerate against the current protocol instead of shipping the stale version.`
		);
	}
	if (!isProtocolVersionSupported(PROTOCOL_VERSION)) {
		throw new Error(
			`PROTOCOL_VERSION (${String(PROTOCOL_VERSION)}) is outside the range @c15t/react-native supports, so no native core could accept a fixture built against it. Widen the supported range in src/protocol/version.ts first.`
		);
	}

	const indexPath = resolve(outDir, INDEX_FILE);
	if (!existsSync(indexPath) || allowProtocolChange) {
		return;
	}
	const previous = JSON.parse(
		readFileSync(indexPath, 'utf8')
	) as Partial<IndexEntry> & { protocolVersion?: number };
	if (
		typeof previous.protocolVersion === 'number' &&
		previous.protocolVersion !== PROTOCOL_VERSION
	) {
		throw new Error(
			`native/protocol/${INDEX_FILE} was written for protocol ${String(previous.protocolVersion)}, and this package speaks ${String(PROTOCOL_VERSION)}. Every expectation has to be re-derived before the fixtures can be relabelled, so a native core does not pass against expectations from the old handshake. Rerun with --allow-protocol-change if the protocol really moved.`
		);
	}
};

/** Serialize with object keys sorted, so a comparison does not depend on order. */
const stableStringify = function stableStringify(value: unknown): string {
	return JSON.stringify(value, (_key, item: unknown) => {
		if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
			const source = item as Record<string, unknown>;
			const sorted: Record<string, unknown> = {};
			for (const name of Object.keys(source).sort()) {
				sorted[name] = source[name];
			}
			return sorted;
		}
		return item;
	});
};

/** Drop the contract version a wire carries but a resolution does not repeat. */
const withoutVersion = function withoutVersion(
	wire: PolicyResolutionWire
): Record<string, unknown> {
	const { version: _version, ...rest } = wire;
	return rest;
};

/**
 * Prove that every init body this run produced is a wire a client takes.
 *
 * The bodies are built from the producer-side resolver, but a native core reads
 * them with a strict client reader. If the two ever disagree, the generator fails
 * here rather than handing both cores a fixture neither can consume.
 */
const assertWiresReadable = function assertWiresReadable(
	fixtures: readonly Fixture[]
): void {
	const contractVersion = Number(CONTRACT_HEADER_VALUE);
	const seen = new Set<string>();
	for (const fixture of fixtures) {
		const { policyResolution } = fixture.input.transport.body;
		if (policyResolution.version !== contractVersion) {
			throw new Error(
				`${fixture.id}: the init body declares policy contract ${String(policyResolution.version)}, but the response header declares ${CONTRACT_HEADER_VALUE}.`
			);
		}
		const wire = stableStringify(policyResolution);
		if (seen.has(wire)) {
			continue;
		}
		seen.add(wire);
		// The strict reader is the same one `applyInitResponse` runs on a live
		// response. Anything it refuses or rewrites makes the fixture a wire no
		// client can actually consume. The wire carries the contract version and a
		// resolution does not repeat it, so the version is dropped before comparing.
		const read = readPolicyResolutionWire(policyResolution);
		if (
			stableStringify(read) !==
			stableStringify(withoutVersion(policyResolution))
		) {
			throw new Error(
				`${fixture.id}: the strict client reader does not reproduce the resolution the producer served. The fixture body is not a wire a client can consume.`
			);
		}
	}
};

// -- Writer -----------------------------------------------------------------

interface IndexEntry {
	bytes: number;
	file: string;
	id: string;
	kind: string;
	protocolVersion: number;
	sha256: string;
}

const sha256Of = function sha256Of(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex');
};

/**
 * Write `index.json` from the bytes on disk.
 *
 * The hashes are taken after formatting, so they describe the file a runner
 * actually opens. A runner that reads a fixture whose bytes do not match its
 * index entry knows the checkout is stale, and says so instead of failing an
 * assertion.
 */
const writeIndex = function writeIndex(
	outDir: string,
	fixtures: readonly Fixture[]
): IndexEntry[] {
	const entries: IndexEntry[] = fixtures.map((fixture) => {
		const file = `${fixture.id}.json`;
		const bytes = readFileSync(resolve(outDir, file));
		return {
			bytes: bytes.byteLength,
			file,
			id: fixture.id,
			kind: fixture.kind,
			protocolVersion: fixture.protocolVersion,
			sha256: sha256Of(bytes),
		};
	});
	const index = {
		clock: NOW,
		count: entries.length,
		fixtures: entries,
		generatedBy: 'packages/react-native/scripts/generate-protocol-fixtures.ts',
		kinds: [...new Set(entries.map((entry) => entry.kind))].sort(),
		policyContractHeader: {
			name: C15T_POLICY_CONTRACT_HEADER,
			value: CONTRACT_HEADER_VALUE,
		},
		protocolVersion: PROTOCOL_VERSION,
	};
	writeFileSync(
		resolve(outDir, INDEX_FILE),
		`${JSON.stringify(index, null, '\t')}\n`,
		'utf8'
	);
	return entries;
};

/** Refuse a fixture file the current run no longer produces. */
const assertNoStaleFixtures = function assertNoStaleFixtures(
	outDir: string,
	entries: readonly IndexEntry[]
): void {
	const expected = new Set<string>([
		...entries.map((entry) => entry.file),
		INDEX_FILE,
	]);
	const stale = readdirSync(outDir)
		.filter((name) => name.endsWith('.json') && !expected.has(name))
		.sort();
	if (stale.length > 0) {
		throw new Error(
			`native/protocol holds fixtures no longer generated: ${stale.join(', ')}. Delete them so no runner reads a fixture the index has forgotten.`
		);
	}
};

const formatWith = function formatWith(paths: string[], cwd: string): void {
	const format = spawnSync('bunx', ['oxfmt', ...paths], {
		cwd,
		stdio: 'ignore',
	});
	if (format.status !== 0) {
		throw new Error(`Oxfmt failed on: ${paths.join(', ')}`);
	}
};

const writeFixtures = async function writeFixtures(): Promise<void> {
	const here = dirname(fileURLToPath(import.meta.url));
	const repoRoot = resolve(here, '..', '..', '..');
	const outDir = resolve(repoRoot, 'native', 'protocol');
	mkdirSync(outDir, { recursive: true });
	// Kernel commands read Date.now() directly, so the whole generation runs against
	// a pinned clock. Without this a notice dismissal recorded by the real command
	// carries the wall-clock time and fails validation against NOW.
	const realDateNow = Date.now;
	Date.now = () => NOW;
	let fixtures: Fixture[];
	try {
		fixtures = [
			...(await buildEvaluationFixtures()),
			...(await buildSaveBodyFixtures()),
			...(await buildStorageFixtures()),
		];
	} finally {
		Date.now = realDateNow;
	}
	assertProtocolVersions(
		fixtures,
		outDir,
		process.argv.includes('--allow-protocol-change')
	);
	assertWiresReadable(fixtures);
	for (const fixture of fixtures) {
		writeFileSync(
			resolve(outDir, `${fixture.id}.json`),
			`${JSON.stringify(fixture, null, '\t')}\n`,
			'utf8'
		);
	}
	// Format before hashing, so the index describes the bytes a runner opens. Oxfmt
	// collapses short arrays and switches indentation to tabs, so writing without
	// this step would leave every regenerated fixture dirty for autofix.ci to fix.
	formatWith([outDir], repoRoot);
	const entries = writeIndex(outDir, fixtures);
	// The index is written after the directory pass, so format it on its own. Its
	// output is a fixed point, which is what keeps two runs byte-identical.
	formatWith([resolve(outDir, INDEX_FILE)], repoRoot);
	for (const entry of entries) {
		const bytes = readFileSync(resolve(outDir, entry.file));
		if (sha256Of(bytes) !== entry.sha256) {
			throw new Error(
				`${entry.file} changed after the index was written. The generator is not byte-stable.`
			);
		}
		// Read the version back rather than trusting the value handed to the writer,
		// so a file that survived from an earlier protocol cannot hide in the set.
		const written = JSON.parse(bytes.toString('utf8')) as {
			protocolVersion?: number;
		};
		if (written.protocolVersion !== PROTOCOL_VERSION) {
			throw new Error(
				`${entry.file} carries protocolVersion ${String(written.protocolVersion)} on disk, not ${String(PROTOCOL_VERSION)}.`
			);
		}
	}
	assertNoStaleFixtures(outDir, entries);
	console.log(
		`Wrote ${String(fixtures.length)} fixtures and ${INDEX_FILE} to native/protocol`
	);
	for (const fixture of fixtures) {
		console.log(`  ${fixture.kind.padEnd(11)} ${fixture.id}.json`);
	}
};

await writeFixtures();
