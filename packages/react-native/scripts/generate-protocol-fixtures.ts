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
 * - `native-envelope-*.json` — what a native core keeps on the device: the field
 *   set its stored envelope must carry, the snapshot inside it, and the decision
 *   a relaunch with no backend has to reach from those bytes alone. The unreadable
 *   cases — an unrecognised field, a write cut short, a retired field shape, a
 *   foreign envelope — all have to read as nothing stored.
 * - `revision-trace-*.json` — a mutation sequence in, the revision and publication
 *   trace the kernel produced for it out. The cross-core parity fixture.
 * - `reset-consent-*.json` — a device with a recorded answer in, the wipe out: the
 *   baseline `reset()` publishes, what its deletion leaves on disk, and the snapshot
 *   the device answers with once the init it re-ran lands.
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
 *
 * Stored envelopes are the one thing here the kernel does not produce, because it has
 * no stored-envelope path to derive one from. Swift and Kotlin encode independently,
 * so `native-envelope-*` pins the field set and the values each core has to keep, and
 * names the reference implementation for any disagreement about spelling. It never
 * pins one core's byte layout, because the other core would have to fail rather than
 * disagree. The snapshot inside an envelope is still kernel output; the deny-all
 * decision an unreadable one has to leave behind is written out below rather than
 * computed, and `OFFLINE_DENY_ALL` and `RESET_BASELINE` are the two
 * hand-written expectations this script emits, and each is written down only because
 * the harness always gives the kernel a transport answer, which leaves no run of it
 * that ends in the state either one describes.
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
	generateSubjectId,
	isValidSubjectId,
	mapInitOutputToInitResponse,
	policyRulePresets,
	readPolicyResolutionWire,
	resolvePolicyRules,
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
	InitResponse,
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
 * The subject ids fixtures replay, every one in the format the producer accepts.
 *
 * `subjectIdSchema` in `packages/schema/src/api/subject/post.ts` requires
 * `^sub_[1-9A-HJ-NP-Za-km-z]+$` and answers anything else with
 * `INPUT_VALIDATION_FAILED`, so a UUID-shaped id in a fixture pins a `POST /subjects`
 * body that no c15t backend would ever accept, and both native cores would faithfully
 * implement a save that can only fail. These are minted by `generateSubjectId` at the
 * pinned `NOW` with the twelve random bytes noted on each, which is the encoding
 * `native/CONTRACT.md` pins: eight big-endian bytes of `now - 1_700_000_000_000`, then
 * the tail, base58 over all twenty bytes with the Bitcoin alphabet. `assertSubjectIds`
 * below refuses any id here that the schema would refuse, so the shape cannot drift back.
 *
 * They are constants and not generated at write time because the expected snapshot and
 * the expected save body both carry the id, and a random one would make every
 * regeneration a diff.
 *
 * These used to be lowercase UUID v4 values, because the Swift core's `SubjectIdentity`
 * once refused to load anything else and a conformance fixture has to settle a
 * disagreement in the strict implementation's favour. That read-side rule has since been
 * inverted: an id the producer will not accept is an identity a core cannot use, so the
 * strict answer is now the `sub_` shape and a core that keeps the old one discards the
 * envelope over it. Both cores enforce that, so the fixtures have to be producible ids.
 */
const SUBJECT = {
	/** The subject behind the California scenarios. */
	california: 'sub_1119tDZHoaqHUq5FWvuwaoswjM',
	/** The California device on its first launch. */
	californiaFirstLaunch: 'sub_111CP17G2b8XH3UdXwWqZZvDtD',
	/** The subject behind the Europe scenarios, and most envelope cases. */
	europe: 'sub_1119tDZHoarNxm6kSm3BN6ze9d',
	/** The Europe device on its first launch. */
	europeFirstLaunch: 'sub_111CP17G2VuBxuByVqaokUtDVc',
	/** The subject with an active GPC signal. */
	gpc: 'sub_1119tDZHoasUSh8FNbAR9Q7LZu',
	/** The subject on the no-match rule. */
	noMatch: 'sub_1119tDZHoatZvd9kJRHevhE2zB',
	/** The subject on the notice-only rule. */
	notice: 'sub_1119tDZHoaufQZBFEFQthzLjQT',
} as const;

/**
 * The clock reading and the twelve random bytes behind each minted id above.
 *
 * The literals in `SUBJECT` stay literals so a regeneration is not a diff, and this
 * table is what keeps them honest: `assertSubjectIdsAreProducible` re-mints every id
 * here through `generateSubjectId` and refuses a literal that is not what that encoder
 * writes. Without it, an id here could drift into something no generator produces and
 * still pass the format check.
 */
const SUBJECT_MINTS: Record<string, { clock: number; randomHex: string }> = {
	california: { clock: NOW, randomHex: '010000000000000000000000' },
	// The two rows below were minted against a live clock rather than the pinned one, and
	// their draw was read back out of the literal upstream committed. That makes the weaker
	// of the two guarantees: for the rows above a draw was chosen first and the id is what
	// minting it wrote; for these two the check proves the literal is a real encoding of
	// twenty bytes, not an invented string in the right shape. Tightening them means
	// minting them here, which restamps two fixtures.
	californiaFirstLaunch: {
		clock: 1_789_671_294_838,
		randomHex: '1b6cf25c72dc89e45f12f012',
	},
	europe: { clock: NOW, randomHex: '020000000000000000000000' },
	europeFirstLaunch: {
		clock: 1_789_671_294_837,
		randomHex: '0648fde8511d6d10fb5baeb3',
	},
	gpc: { clock: NOW, randomHex: '030000000000000000000000' },
	noMatch: { clock: NOW, randomHex: '040000000000000000000000' },
	notice: { clock: NOW, randomHex: '050000000000000000000000' },
};

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
	/**
	 * Whether `hydrate()` found a stored envelope before the step under test.
	 *
	 * This is the one hydration fact that latches `ready`, and it is the only one:
	 * a hydrate that read nothing leaves the flag low no matter how far the step
	 * runs. The subject id lives in its own slot, so a fixture can carry an
	 * identity and still hydrate into nothing stored.
	 */
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

/** The two native cores, named the way `native/CONTRACT.md` names them. */
const NATIVE_CORES = ['swift', 'kotlin'] as const;

/** One of the native cores that owns a stored envelope. */
type NativeCore = (typeof NATIVE_CORES)[number];

/**
 * One fact a stored envelope has to hold, described once for both cores.
 *
 * The two cores are separate implementations of the same idea, and they spell
 * parts of it differently: Swift keeps the raw policy wire under
 * `policyResolution`, Kotlin keeps a typed `EvaluationPolicy` under
 * `evaluationPolicy`, and only Swift records a format version and a write time.
 * So a field is named by what it is for (`key`, a label neither core writes), and
 * `carriers` gives each core its own name for it. A core whose name is absent does
 * not carry the fact at all, which `native/CONTRACT.md` records as a difference
 * rather than a defect.
 */
interface NativeEnvelopeField {
	/** Where each core keeps the fact. Omitted for a core that does not keep it. */
	readonly carriers: Partial<Record<NativeCore, string>>;
	/** `'present'`, `'empty'`, or a literal the decoded value must equal. */
	readonly expect: 'empty' | 'present' | boolean | number | string;
	/** `true` when a consent decision changes if this field is lost or wrong. */
	readonly loadBearing: boolean;
	/** Cores that must write the field. Others may omit it entirely. */
	readonly requiredBy: readonly NativeCore[];
	/** Neutral label for the fact, never a name either core writes. */
	readonly key: string;
	/** Why the fact is in the envelope at all. */
	readonly role: string;
}

/** The implementation whose envelope layout `native/CONTRACT.md` documents. */
interface NativeEnvelopeReference {
	readonly core: NativeCore;
	/** How that core orders keys, which is the only byte-level claim made here. */
	readonly keyOrder: 'alphabetical';
	readonly why: string;
}

/** The action a write fixture asks the core to take before it stores anything. */
type NativeEnvelopeAction =
	| CommitIntent
	| { readonly action: 'dismiss-notice' };

/**
 * The defect a read fixture introduces, applied to bytes its own core just wrote.
 *
 * Stated as an operation rather than as a literal string because the two cores
 * write different bytes: the base envelope is only valid for the core that wrote
 * it, so the runner produces it and then breaks it the same way. Only
 * `foreign-wire` ships the bytes, because those come from a third surface that
 * neither core wrote and both must refuse.
 */
type NativeEnvelopeDefect =
	| {
			/** A field neither the format nor this build names. */
			readonly addField: string;
			readonly kind: 'unknown-field';
			readonly value: boolean;
	  }
	/** Everything from the last comma of the envelope onwards is gone. */
	| { readonly kind: 'truncate' }
	/** The snapshot rewritten into the shape the first contract draft described. */
	| { readonly kind: 'pre-correction' }
	| {
			readonly envelope: string;
			readonly kind: 'foreign-wire';
			readonly source: string;
	  };

/**
 * What the core answers when it boots over stored bytes and reaches no backend.
 *
 * This is the whole reason an envelope exists: a phone in a tunnel still has to
 * honour the decision the subject already made, and a phone whose bytes are
 * unreadable still has to deny. Both halves are read offline so no transport
 * result can stand in for the envelope's own content.
 */
interface NativeEnvelopeRelaunch {
	readonly decision: {
		readonly allowed: Record<AllConsentNames, boolean>;
		readonly policyPending: boolean;
		readonly ready: boolean;
	};
	readonly offline: true;
}

interface NativeEnvelopeFixture {
	protocolVersion: number;
	kind: 'native-envelope';
	id: string;
	description: string;
	notes: string[];
	/** Which core settles a disagreement about how a fact is spelled. */
	reference: NativeEnvelopeReference;
	/** The stored field set, in the order a reader should walk it. */
	fields: NativeEnvelopeField[];
	input: FixtureInput & {
		action?: NativeEnvelopeAction;
		defect?: NativeEnvelopeDefect;
	};
	expected: {
		/** The snapshot inside the envelope. Kernel-derived, so a real expectation. */
		snapshot?: FixtureSnapshot;
		/** Present on the read cases: the bytes must yield nothing. */
		read?: {
			decoded: false;
			identicalToFreshInstall: true;
			stored: false;
		};
		relaunch: NativeEnvelopeRelaunch;
		/** Present on the write cases: the bytes must read back as themselves. */
		write?: {
			decoded: 'itself';
			storedSnapshotMatchesLive: true;
		};
	};
}

/** What one step of a mutation sequence asks a core to do. */
type TraceStep =
	/** Deliver `/init`, the way a later refresh or a reconnected device does. */
	| {
			readonly op: 'init';
			readonly step: string;
			readonly transport: InitTransport;
	  }
	/** Commit a consent action. */
	| {
			readonly op: 'save';
			readonly step: string;
			readonly intent: CommitIntent;
	  }
	/** Close the current notice. */
	| { readonly op: 'dismiss-notice'; readonly step: string };

/**
 * One step, as observed from outside the core.
 *
 * Both numbers come from watching the kernel, not from reasoning about it:
 * `revisionDelta` is the change in `snapshot.revision` across the step, and
 * `publications` counts the snapshot listeners the step woke. They are expected
 * to agree on every step (a published change is a bumped revision), and stating
 * both is what makes a core that bumps without publishing, or publishes without
 * bumping, show up as a mismatch rather than a passing run.
 */
interface TraceObservation {
	readonly publications: number;
	readonly revisionDelta: number;
	readonly step: string;
}

/**
 * A mutation sequence with the revision trace the kernel produced for it.
 *
 * This is the one fixture kind that pins a number the three implementations
 * cannot share absolutely: `native/CONTRACT.md` says hydration and bootstrap are
 * mutations in some cores and not in others, so a core's absolute revision is its
 * own. What all three must agree on is what each step costs, which is what this
 * fixture measures. See "Revisions and error writes" in `native/CONTRACT.md`.
 */
interface RevisionTraceFixture {
	protocolVersion: number;
	kind: 'revision-trace';
	id: string;
	description: string;
	notes: string[];
	input: Omit<FixtureInput, 'transport'> & {
		/** The `/init` bootstrap serves, before any step runs. */
		transport: InitTransport;
		steps: TraceStep[];
	};
	expected: {
		trace: TraceObservation[];
	};
}

/**
 * A device that had answered, wiped, and what it has to answer with afterwards.
 *
 * `expected.baseline` is the snapshot `reset()` publishes and nothing else has run
 * yet; `expected.disk` is what the wipe's deletion leaves under it; `expected.afterInit`
 * is the snapshot the device settles on once the init the wipe re-ran has landed, which
 * is the same snapshot a device that never decided settles on. The two fixtures of this
 * kind differ only in `input.intent`, and their `expected` halves are identical, which
 * is the claim "Wiping consent (reset)" in `native/CONTRACT.md` makes: a wipe leaves no
 * trace of which decision it deleted.
 */
interface ResetConsentFixture {
	protocolVersion: number;
	kind: 'reset-consent';
	id: string;
	description: string;
	notes: string[];
	input: FixtureInput & {
		/** The decision on the device at the moment the wipe lands. */
		intent: CommitIntent;
	};
	expected: {
		baseline: {
			/** Read at the baseline publication, before the re-run init can write. */
			disk: {
				envelope: false;
				pendingSaves: false;
				subject: true;
			};
			/**
			 * What the wipe costs the numbering.
			 *
			 * One bump, stated as a delta because the absolute is the device's own: the
			 * contract says so under "Revisions and error writes", and a core that
			 * installs the baseline without publishing, or restarts the count at the
			 * cold-start number, fails here rather than in a comment.
			 */
			revisionDelta: number;
			snapshot: Omit<FixtureSnapshot, 'revision'>;
		};
		afterInit: {
			snapshot: Omit<FixtureSnapshot, 'revision'>;
		};
	};
}

type Fixture =
	| EvaluationFixture
	| SaveBodyFixture
	| NativeEnvelopeFixture
	| ResetConsentFixture
	| RevisionTraceFixture;

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

/**
 * A policy contract declaration this client does not speak.
 *
 * Any number above `POLICY_CONTRACT_VERSION` would do; the smallest one above it
 * is the honest shape of the accident, which is a backend one revision ahead of
 * the SDK in the binary. Every client refuses it the same way: the declaration is
 * read before the body, and a body under an unknown contract is not evidence.
 */
const UNSPOKEN_CONTRACT_HEADER_VALUE = '2';

/** The same `/init` body, served by a producer this client cannot talk to. */
const unspeakingTransportFor = function unspeakingTransportFor(
	body: InitResponseBody
): InitTransport {
	return {
		body,
		headers: {
			[C15T_POLICY_CONTRACT_HEADER]: UNSPOKEN_CONTRACT_HEADER_VALUE,
		},
		status: 200,
	};
};

/**
 * Fold an `InitTransport` into the response a client hands its kernel.
 *
 * The contract declaration is read out of the fixture's own headers rather than
 * assumed, so a fixture that wants a negotiated producer and one that wants a
 * refused producer travel through the same code.
 */
const initResponseFor = function initResponseFor(
	transport: InitTransport
): InitResponse {
	const declared = transport.headers[C15T_POLICY_CONTRACT_HEADER];
	return mapInitOutputToInitResponse(
		transport.body,
		{},
		{ producerContract: declared === undefined ? undefined : Number(declared) }
	);
};

/**
 * Whether an `/init` response is the definitive answer the ready latch waits for.
 *
 * `native/CONTRACT.md` counts two ways to be told: an envelope at hydrate, and the
 * first init that lands a definitive answer. Only a negotiated declaration over a
 * readable body is that answer. The refused-declaration variant is a body the client
 * has already been told is not evidence, so it tells the core nothing and leaves the
 * flag exactly where it was.
 */
const isDefinitiveInit = function isDefinitiveInit(
	transport: InitTransport
): boolean {
	return (
		transport.status === 200 &&
		transport.headers[C15T_POLICY_CONTRACT_HEADER] === CONTRACT_HEADER_VALUE
	);
};

/**
 * Derive `ready` instead of copying `hydrated`.
 *
 * Copying it reads the flag as "a stored envelope exists", which is the mistake
 * `native/CONTRACT.md` calls out: a fresh install with nothing stored is stranded on
 * `false` for its whole first session, so `GRANTED` is unreachable on the one launch
 * a prompt is actually on screen and a listener waiting on readiness never resumes.
 */
const readyFor = function readyFor(
	input: Pick<FixtureInput, 'hydrated' | 'transport'>
): boolean {
	return input.hydrated || isDefinitiveInit(input.transport);
};

const inputFor = function inputFor(
	scenario: Scenario,
	options: { hydrated?: boolean; records?: StoredRecords } = {}
): FixtureInput {
	return {
		// Every scenario carries a stored subject, so the default is a returning
		// device whose hydrate() found an envelope. A first launch has to say so, and
		// then `ready` can only come from the response the transport serves.
		hydrated: options.hydrated ?? true,
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
 * Build a kernel over a transport double, with nothing injected but the device.
 *
 * Both harnesses -- the single-step fixtures and the revision trace -- go through
 * here, so the two cannot drift into different definitions of "the same input".
 * Policy, records, and overrides all arrive the way they arrive on device, which
 * is what makes the kernel's own revision numbering the number under test.
 *
 * @param input - Device state the kernel starts from.
 * @param init - What `/init` answers, called on every init including a retry.
 * @returns The kernel, and the save payloads it put on the wire.
 */
const kernelFor = function kernelFor(
	input: Pick<
		FixtureInput,
		'now' | 'overrides' | 'privacySignals' | 'storedRecords' | 'user'
	>,
	init: () => Promise<InitResponse>
): {
	kernel: ReturnType<typeof createConsentKernel>;
	payloads: SavePayload[];
} {
	const payloads: SavePayload[] = [];
	const initialOverrides: KernelOverrides = {
		language: input.overrides.language ?? DEFAULT_NATIVE_LANGUAGE,
	};
	if (input.overrides.gpc !== null) {
		initialOverrides.gpc = input.overrides.gpc;
	}
	return {
		kernel: createConsentKernel({
			initialOverrides,
			initialPolicyPending: true,
			initialPrivacySignals: {
				gpc: input.privacySignals.gpc.detected ?? false,
			},
			initialRecords: hydrationFor(input.storedRecords),
			initialUser: input.user ?? undefined,
			now: input.now,
			transport: {
				init,
				save: (payload) => {
					payloads.push(payload);
					return Promise.resolve({ ok: true, subjectId: payload.subjectId });
				},
			},
		}),
		payloads,
	};
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
	const response = initResponseFor(input.transport);
	const { kernel, payloads } = kernelFor(input, () =>
		Promise.resolve(response)
	);
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

/**
 * Run a mutation sequence and record what each step cost the kernel.
 *
 * The two numbers come from two independent observations of the same run: the
 * revision the snapshot carries afterwards, and the count of snapshot listeners
 * the step woke. Nothing here computes what the trace "should" be -- the kernel
 * decides that by running, which is the whole reason the fixture exists.
 *
 * The transport answers whatever the current step says it should, which is also
 * what a retry sees: an init the kernel retries internally gets the same
 * declaration again, exactly as a device re-asking the same backend would.
 *
 * @param input - The device state, the bootstrap response, and the steps.
 * @returns One observation per step, in order.
 */
const runTraceFixture = async function runTraceFixture(
	input: RevisionTraceFixture['input']
): Promise<TraceObservation[]> {
	let serving = initResponseFor(input.transport);
	const { kernel } = kernelFor(input, () => Promise.resolve(serving));
	await kernel.commands.init();

	// Attached after bootstrap, so a publication belongs to a step and never to
	// the hydration some other core counts as its own mutation.
	let publications = 0;
	kernel.subscribe(() => {
		publications += 1;
	});
	let { revision } = kernel.getSnapshot();

	const trace: TraceObservation[] = [];
	/* oxlint-disable no-await-in-loop -- sequential on purpose; one clock for all */
	for (const step of input.steps) {
		if (step.op === 'init') {
			serving = initResponseFor(step.transport);
			await kernel.commands.init();
		} else if (step.op === 'save') {
			await kernel.commands.save(saveInputFor(step.intent), {
				actionAt: input.now,
			});
		} else {
			await kernel.commands.dismissNotice();
		}
		const next = kernel.getSnapshot().revision;
		trace.push({
			publications,
			revisionDelta: next - revision,
			step: step.step,
		});
		publications = 0;
		revision = next;
	}
	return trace;
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
	'evaluatedAt equals input.now. Both it and ready are native lifecycle facts, not kernel output: ready is latched by a hydrate() that found a stored envelope and by the first /init that lands a definitive answer, which is a negotiated contract header over a 200 body. Nothing stored plus a resolved init is therefore ready true, and only an init that was refused or never arrived leaves it false.',
	'error is null in every fixture: no fixture exercises a transport failure or an unreadable wire.',
	'Any field this file does not mention must not be invented. Unknown wire values fail closed.',
];

/**
 * Project a kernel snapshot onto the shape a native core must produce.
 *
 * This is the mapping the native cores implement, written down once so the
 * fixtures and the TypeScript side cannot drift apart. `ready` and `error` are
 * native lifecycle facts the kernel does not model, so the caller derives `ready`
 * with {@link readyFor} and the error stays `null` for every fixture here.
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

/**
 * The subject-facing category list the native snapshot carries.
 *
 * The native cores decide this list themselves -- `decidedCategories` in each of
 * them -- and it is the set the web dialog shows for the same input: `necessary`,
 * then the choice scope the kernel projects (the policy scope narrowed by the
 * categories the app registered, or the whole policy scope when it registered
 * none). `necessary` leads and the optional names follow in canonical sorted
 * order, which is the order both cores emit; the JavaScript layer re-orders that
 * into display order. The fixture configs register no categories, so what the
 * kernel projects is the sorted scope, and both cores have to agree with it.
 */
const fixtureDecisionCategories = function fixtureDecisionCategories(
	snapshot: KernelSnapshot
): readonly AllConsentNames[] {
	const decided =
		snapshot.evaluationPolicy.choiceScope ?? snapshot.evaluationPolicy.scope;
	return [
		'necessary',
		...[...decided].sort((left, right) => left.localeCompare(right)),
	];
};

const toFixtureSnapshot = function toFixtureSnapshot(
	snapshot: KernelSnapshot,
	ready: boolean
): FixtureSnapshot {
	const { overrides } = snapshot;
	const { resolution } = snapshot;
	return {
		activeUI: snapshot.activeUI,
		consentCategories: fixtureDecisionCategories(snapshot),
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
		ready,
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
		expected: { snapshot: toFixtureSnapshot(snapshot, readyFor(input)) },
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

		// The two launches every other fixture skips: nothing stored, so hydrate() has
		// no envelope to find and `ready` can only arrive with the init response. A core
		// that reads the flag as "a stored envelope exists" answers both `false` and
		// strands the device in PENDING for the whole of its first session, which is the
		// one session a prompt is on screen. The pinned subject id is not storage: the
		// identity has its own slot, and native/CONTRACT.md keeps an envelope refusal from
		// costing a device its identity. It is a `sub_` id, so nothing here reads as the
		// refused-id case the Subject identity ruling sends to a first launch -- these two
		// are a first launch because the envelope slot is empty, and for no other reason.
		const freshCases: {
			id: string;
			description: string;
			scenario: Scenario;
			/** A first launch still pins its identity: the slot is separate from the envelope. */
			subjectId: string;
		}[] = [
			{
				description:
					'The Europe opt-in rule on a device with nothing stored. Hydrate found no envelope, so the resolved init is the only thing that could raise `ready`; permissions still deny every optional category and the choice prompt is still owed. Fail closed and ready are not opposites, and the flag is what tells a host the answer has landed.',
				id: 'eu-fresh-install',
				scenario: EU_SCENARIO,
				subjectId: SUBJECT.europeFirstLaunch,
			},
			{
				description:
					'The California opt-out rule on a device with nothing stored. The init resolves, so the first launch is ready, and the opt-out default leaves every optional category allowed: GRANTED on a launch with no stored envelope, which is exactly the state a core that latches `ready` on stored bytes cannot reach.',
				id: 'us-ccpa-fresh-install',
				scenario: CCPA_SCENARIO,
				subjectId: SUBJECT.californiaFirstLaunch,
			},
		];
		// Sequential for the same reason as the cases above: one kernel against the
		// pinned clock at a time.
		/* oxlint-disable no-await-in-loop -- sequential on purpose, see above */
		for (const freshCase of freshCases) {
			const freshInput = inputFor(freshCase.scenario, {
				hydrated: false,
				records: storedFor(freshCase.subjectId),
			});
			const fresh = await runFixture(freshInput);
			fixtures.push(
				evaluationFixture(
					freshCase.id,
					freshCase.description,
					freshInput,
					fresh.after
				)
			);
		}
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
				snapshotAfter: toFixtureSnapshot(after, readyFor(input)),
				snapshotBefore: toFixtureSnapshot(before, readyFor(input)),
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

/**
 * Write the web consent-record envelope.
 *
 * Neither native core writes this shape, which is exactly why it survives here: it
 * is the bytes one c15t surface stores and another must refuse. Producing it from
 * the real v3 codec rather than typing it by hand keeps the refusal honest — the
 * fixture hands over a genuine web envelope, not a guess at one.
 */
const encodeEnvelope = function encodeEnvelope(
	envelope: StoredEnvelope
): string {
	return JSON.stringify({
		categories: envelope.categories,
		subject: envelope.subject,
		version: 3,
	});
};

// -- Native stored envelopes ------------------------------------------------

/**
 * The envelope format version the reference core stamps.
 *
 * Swift declares a number and Kotlin carries none, so this is pinned against the
 * reference core and carried as a gap in `native/CONTRACT.md` rather than demanded
 * of both. It gates readability, not a decision: an envelope at any other number is
 * unreadable, and an unreadable envelope is nothing stored.
 */
const ENVELOPE_FORMAT_VERSION = 1;

/** The field a read fixture adds when it wants one this build cannot name. */
const UNRECOGNISED_ENVELOPE_FIELD = 'com.c15t.experiment';

/**
 * What a core that reaches no backend answers with.
 *
 * `native/CONTRACT.md` states this under "The stored envelope" rather than leaving it
 * to each core: nothing resolved, every optional category denied, and `ready` false so a
 * host can tell a cold install apart from a denied one. It is not kernel output,
 * because the kernel in this harness always gets a transport answer; an offline
 * relaunch is a native-only case, and this is the one place in the file where an
 * expectation is written down instead of produced by running something.
 */
const OFFLINE_DENY_ALL: Record<AllConsentNames, boolean> = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

/** The implementation whose stored layout the contract documents. */
const ENVELOPE_REFERENCE: NativeEnvelopeReference = {
	core: 'swift',
	keyOrder: 'alphabetical',
	why: 'Swift writes its envelope with a sorted-keys JSON encoder, so its layout is a plain function of the value and the one native/CONTRACT.md documents field by field. Kotlin encrypts its blob and keys two of these facts differently. Where the two disagree about how a fact is spelled, this core is the reference and the other moves.',
};

const ENVELOPE_NOTES = [
	...NOTES,
	'this kind pins what a stored consent snapshot looks like on a device. The kernel has no such format: Swift writes a StoredEnvelope as plain JSON and Kotlin writes a SnapshotEnvelope into an encrypted blob, so expected.snapshot is the only kernel-derived half of this file.',
	'reference.core names the implementation whose layout native/CONTRACT.md documents. A disagreement about how a fact is spelled is settled by that core and the other one moves, which is why nothing here pins a byte layout: the other core could only fail rather than disagree.',
	'fields is the stored field set. fields[].key is a neutral label and never a name either core writes; carriers holds each core name for the fact, and a core with no entry there does not carry it at all. requiredBy lists the cores that must write it.',
	'fields[].loadBearing is true where a consent decision changes if the field is lost or wrong. expect is present (a non-null value), empty (null or absent), or a literal the decoded value must equal. Compare the decoded value and not the serialized key, because Kotlin writes every key every time and key presence alone proves nothing.',
	'relaunch.offline means start a second core over the bytes the first one wrote, with no backend to answer. That is the case a phone in a tunnel is in, and it is the only case that proves the envelope carries enough to answer on its own.',
	'read.identicalToFreshInstall means the defective bytes have to leave the core answering exactly what an empty store leaves it answering, field for field, revision included. A half-decoded envelope answers like a returning user, and that is the thing this forbids.',
	'a defect is applied to the bytes the core itself just wrote, so the base envelope is always valid for the core that wrote it. Only the named defect may make it unreadable; a base that never decoded in the first place makes the fixture meaningless rather than passing.',
	'every read case starts from an accept-all, so the bytes really do hold a marketing grant. Denying everything is then the observable difference between failing closed and reading what is there.',
];

/**
 * The stored field set, with the dismissal expectation set per case.
 *
 * This is a description of a format rather than kernel output, and it belongs here
 * rather than in either runner so the two cannot each grow their own idea of what an
 * envelope holds. A change to it is a change to `native/CONTRACT.md`, which records
 * the same field set in prose.
 */
const envelopeFieldsFor = function envelopeFieldsFor(
	noticeDismissal: 'empty' | 'present'
): NativeEnvelopeField[] {
	return [
		{
			carriers: { kotlin: 'snapshot', swift: 'snapshot' },
			expect: 'present',
			key: 'snapshot',
			loadBearing: true,
			requiredBy: ['swift', 'kotlin'],
			role: 'the last derived snapshot, so a cold start answers snapshot() on the first synchronous call with no network and no re-derivation',
		},
		{
			carriers: {
				kotlin: 'evaluationPolicy',
				swift: 'policyResolution',
			},
			expect: 'present',
			key: 'policy',
			loadBearing: true,
			requiredBy: ['swift', 'kotlin'],
			role: 'the policy the stored receipts were judged against. Without it a relaunch has to reach the backend before it can answer at all, which turns a cached grant back into a prompt',
		},
		{
			carriers: { kotlin: 'noticeDismissal', swift: 'noticeDismissal' },
			expect: noticeDismissal,
			key: 'noticeDismissal',
			loadBearing: true,
			requiredBy: ['swift', 'kotlin'],
			role: 'a record and not a permission: it decides whether the notice is still owed, so it is stored beside the snapshot rather than folded into it',
		},
		{
			carriers: { swift: 'version' },
			expect: ENVELOPE_FORMAT_VERSION,
			key: 'version',
			loadBearing: false,
			requiredBy: ['swift'],
			role: 'the envelope format version. It gates readability rather than the decision: an envelope at any other number is unreadable here and is therefore ignored',
		},
		{
			carriers: { swift: 'storedAt' },
			expect: NOW,
			key: 'storedAt',
			loadBearing: false,
			requiredBy: ['swift'],
			role: 'epoch milliseconds of the write, for diagnostics and the newest-writer-wins check. Kotlin records no write time at all, which native/CONTRACT.md carries as a known gap',
		},
	];
};

/**
 * Build the stored-envelope fixtures.
 *
 * Two directions. A write case boots a core, has it store a real decision, and asks
 * what the bytes must hold; a read case does the same and then breaks those bytes
 * before a second core reads them. Both end the same way, offline, because that is
 * the only moment the envelope itself is what is being tested.
 */
const buildNativeEnvelopeFixtures =
	async function buildNativeEnvelopeFixtures(): Promise<
		NativeEnvelopeFixture[]
	> {
		const grants = await runFixture(inputFor(EU_SCENARIO), {
			intent: { action: 'all' },
		});
		if (!grants.payload) {
			throw new Error('No save payload captured for the envelope fixtures.');
		}
		const partial = await runFixture(inputFor(EU_SCENARIO), {
			intent: {
				action: 'explicit',
				consents: { marketing: false, measurement: true },
			},
		});
		const dismissed = await runFixture(inputFor(NOTICE_SCENARIO), {
			dismiss: true,
		});
		const optOut = await runFixture(inputFor(CCPA_SCENARIO), {
			intent: { action: 'all' },
		});

		// A genuine web envelope, produced by the v3 codec and stored by neither
		// native core. The refusal is only worth pinning if the bytes are real.
		const foreignWire = encodeEnvelope({
			categories: grants.payload.choice.categories,
			subject: { subjectId: SUBJECT.europe },
			version: 3,
		});

		/** Every read case starts here, so the bytes hold a real grant to lose. */
		const grantedInput = (): FixtureInput => ({
			...inputFor(EU_SCENARIO),
			action: { action: 'all' },
		});

		const cases: {
			after: KernelSnapshot;
			description: string;
			id: string;
			input: NativeEnvelopeFixture['input'];
			noticeDismissal: 'empty' | 'present';
			read: boolean;
		}[] = [
			{
				after: grants.after,
				description:
					'An accept-all under a Europe opt-in rule stores the resolved policy and the receipts beside it, and a relaunch that reaches no backend still allows every optional category from those bytes alone.',
				id: 'native-envelope-opt-in-grants',
				input: { ...inputFor(EU_SCENARIO), action: { action: 'all' } },
				noticeDismissal: 'empty',
				read: false,
			},
			{
				after: partial.after,
				description:
					'A partial save stores exactly the two categories the subject touched. The relaunch keeps measurement allowed and marketing denied, and takes the opt-in default for the two the subject never looked at.',
				id: 'native-envelope-partial-denials',
				input: {
					...inputFor(EU_SCENARIO),
					action: {
						action: 'explicit',
						consents: { marketing: false, measurement: true },
					},
				},
				noticeDismissal: 'empty',
				read: false,
			},
			{
				after: dismissed.after,
				description:
					'Dismissing a notice-only prompt is a record and not a permission, so the dismissal is stored beside the snapshot and a relaunch with no backend still knows the notice was closed.',
				id: 'native-envelope-notice-dismissed',
				input: {
					...inputFor(NOTICE_SCENARIO),
					action: { action: 'dismiss-notice' },
				},
				noticeDismissal: 'present',
				read: false,
			},
			{
				after: optOut.after,
				description:
					'The same accept-all under a California opt-out rule, stored and read back offline. The opt-out policy travels with the receipts, so a relaunch cannot mistake a cached decision for a pending one.',
				id: 'native-envelope-opt-out-grants',
				input: { ...inputFor(CCPA_SCENARIO), action: { action: 'all' } },
				noticeDismissal: 'empty',
				read: false,
			},
			{
				after: grants.after,
				description: `A valid envelope with one field this build does not recognise: \`${UNRECOGNISED_ENVELOPE_FIELD}\`. Reading it partly would restore the grant inside it, so the whole envelope is dropped, nothing is applied, and the answer is identical to a fresh install.`,
				id: 'native-envelope-unknown-field',
				input: {
					...grantedInput(),
					defect: {
						addField: UNRECOGNISED_ENVELOPE_FIELD,
						kind: 'unknown-field',
						value: true,
					},
				},
				noticeDismissal: 'empty',
				read: true,
			},
			{
				after: grants.after,
				description:
					'A valid envelope with everything from the last comma onwards missing, the way an interrupted write leaves it. These bytes are a prefix of a real grant, which is precisely why a reader that repairs what it can parse is the wrong reader.',
				id: 'native-envelope-truncated-write',
				input: { ...grantedInput(), defect: { kind: 'truncate' } },
				noticeDismissal: 'empty',
				read: true,
			},
			{
				after: grants.after,
				description:
					'A valid envelope whose snapshot has been rewritten into the shape the first draft of native/CONTRACT.md described: overrides.test, a boolean privacySignals.gpc, and privacySignals.msa. Those names model nothing this build has, so the grant sitting next to them is not evidence.',
				id: 'native-envelope-pre-correction-shape',
				input: { ...grantedInput(), defect: { kind: 'pre-correction' } },
				noticeDismissal: 'empty',
				read: true,
			},
			{
				after: grants.after,
				description:
					'The web v3 consent-record envelope written into native protected storage. It is a real c15t format and not this one, so a native core that read it would be granting consent out of a codec it has never written and cannot re-derive.',
				id: 'native-envelope-foreign-wire',
				input: {
					...grantedInput(),
					defect: {
						envelope: foreignWire,
						kind: 'foreign-wire',
						source: 'the web SDK consent-record envelope (v3 record format)',
					},
				},
				noticeDismissal: 'empty',
				read: true,
			},
		];

		return cases.map((testCase) => ({
			description: testCase.description,
			expected: {
				...(testCase.read
					? {
							read: {
								decoded: false as const,
								identicalToFreshInstall: true as const,
								stored: false as const,
							},
						}
					: {
							snapshot: toFixtureSnapshot(
								testCase.after,
								readyFor(testCase.input)
							),
							write: {
								decoded: 'itself' as const,
								storedSnapshotMatchesLive: true as const,
							},
						}),
				relaunch: {
					decision: testCase.read
						? {
								allowed: { ...OFFLINE_DENY_ALL },
								policyPending: true,
								ready: false,
							}
						: {
								allowed: { ...testCase.after.effectivePermissions },
								policyPending: false,
								ready: true,
							},
					offline: true as const,
				},
			},
			fields: envelopeFieldsFor(testCase.noticeDismissal),
			id: testCase.id,
			input: testCase.input,
			kind: 'native-envelope',
			notes: ENVELOPE_NOTES,
			protocolVersion: PROTOCOL_VERSION,
			reference: ENVELOPE_REFERENCE,
		}));
	};

// -- Guards -----------------------------------------------------------------

const TRACE_NOTES = [
	...NOTES,
	'the trace starts after bootstrap has settled: hydration and bootstrap are mutations in some cores and not in others, so the anchor is the settled snapshot and the absolute revision a core reports is its own business. What every core must reproduce is what each step costs.',
	'revisionDelta is the change in snapshot.revision across the step, and publications counts the snapshot listeners it woke. A committed change bumps the revision exactly once and publishes exactly once; a write that changes the committed value nowhere bumps nothing and publishes nothing. See "Revisions and error writes" in native/CONTRACT.md.',
	'two of these steps are the same answer twice on purpose. Re-serving an init that changed nothing, and re-reporting an error the snapshot already carries, are not new changes: a bridge that dedups by revision has to be able to treat them as noise.',
	'an unsupported-contract response is refused from its header, before the body is read. The body here is the ordinary Europe one, which is the point: a core that reached into it would be reading a wire it has already been told is not evidence.',
	'expected.trace is not about which fields the error write touches. Swift, Kotlin, and the kernel write different fields for a refused contract; what they must not disagree about is whether the write was a change at all.',
];

/**
 * Build the revision trace for a backend that refuses to be understood.
 *
 * The sequence is the one a misconfigured app actually walks into: it starts with
 * a working backend, a save lands, the producer is then upgraded past what the
 * shipped binary speaks, and every later init is refused. Whether the error write
 * is a revision-bearing change decides whether JavaScript hears about it at all,
 * because the bridge pump drops a `snapshot` event whose revision it has already
 * announced.
 */
const buildRevisionTraceFixtures =
	async function buildRevisionTraceFixtures(): Promise<RevisionTraceFixture[]> {
		const scenario = EU_SCENARIO;
		const resolved = transportFor(initBodyFor(scenario));
		const refused = unspeakingTransportFor(initBodyFor(scenario));
		const input: RevisionTraceFixture['input'] = {
			...inputFor(scenario),
			steps: [
				{
					intent: { action: 'all' },
					op: 'save',
					step: 'save-all',
				},
				{ op: 'init', step: 'init-resolved-again', transport: resolved },
				{ op: 'init', step: 'init-unsupported-contract', transport: refused },
				{
					op: 'init',
					step: 'init-unsupported-contract-again',
					transport: refused,
				},
			],
			transport: resolved,
		};
		return [
			{
				description:
					'A commit, a re-served init, and a policy contract the SDK does not speak, twice. The commit and the refused contract each cost one revision and one publication; the init that changed nothing and the repeated error cost nothing.',
				expected: { trace: await runTraceFixture(input) },
				id: 'revision-trace-error-writes',
				input,
				kind: 'revision-trace',
				notes: TRACE_NOTES,
				protocolVersion: PROTOCOL_VERSION,
			},
		];
	};

/**
 * The snapshot a wiped device is left holding, before the init it re-ran answers.
 *
 * Written down rather than run, for the reason the file header gives: every kernel
 * harness in this script serves a transport answer, so no run of it ends with a device
 * that has dropped its policy claim and not yet acquired a new one. The values are the
 * table in "Wiping consent (reset)" in `native/CONTRACT.md`, and they are the same ones
 * a core installs on a first launch that has not heard from the network.
 *
 * `revision` is absent rather than pinned. A wipe is a committed mutation, so the number
 * it publishes is the one the device was on plus one, which no absolute can state; the
 * delta below pins the half that is stateable.
 */
/**
 * The list a pending device lists.
 *
 * A wipe (or a first launch) leaves the core without a policy, and the pending
 * evaluator runs the safe fallback rule over every optional category, so the
 * subject-facing list is `necessary` plus all four in canonical sorted order.
 * Same rule as `fixtureDecisionCategories`, with the fallback scope behind it.
 */
const FULL_DECIDED_CATEGORIES: readonly AllConsentNames[] = [
	'necessary',
	'experience',
	'functionality',
	'marketing',
	'measurement',
];

const RESET_BASELINE: Omit<
	FixtureSnapshot,
	| 'consentCategories'
	| 'effectivePermissions'
	| 'overrides'
	| 'privacySignals'
	| 'revision'
	| 'subject'
> = {
	activeUI: 'none',
	error: null,
	evaluatedAt: NOW,
	explicitChoice: null,
	iab: null,
	location: null,
	model: 'opt-in',
	nextDeadline: null,
	optOutDirectives: [],
	policyPending: true,
	policySnapshotToken: null,
	promptRequirement: { kind: 'none' },
	ready: false,
	resolution: {
		fingerprint: null,
		policyId: null,
		status: 'unconfigured',
	},
	restrictions: {},
	translations: null,
};

const RESET_NOTES = [
	...NOTES,
	'a wipe is judged against one yardstick: the state a device that has never been used boots into. expected.baseline is that state, and every field of it is either installed by the wipe or kept by it, never carried over from whatever the device was doing.',
	'installed: policyPending true, ready false, promptRequirement none, activeUI none, effectivePermissions necessary-only, evaluatedAt equal to input.now, and no explicitChoice, notice dismissal, policy claim, resolution, snapshot token, location, translations, opt-out directives, deadline, or error. A device that stops at a recorded denial instead would keep promptRequirement at none and no surface would ever come back, which is the one state a subject cannot get out of.',
	'kept: the subject id, because native/CONTRACT.md refuses to orphan the audit history the backend holds against it; overrides and privacySignals, because a country pinned for QA and a GPC switch are configuration rather than consent; and the configured category scope, which a wipe recomputes from configuration rather than consent. No fixture configures a narrower scope, so the baseline lists `necessary` plus every optional category: the rows the safe fallback rule covers until a policy resolves.',
	'revision is not pinned. A wipe is a committed mutation, so it publishes the revision the device was on plus one, and native/CONTRACT.md refuses to compare the absolute numbering the three implementations start from. A core that restarts the numbering at the cold-start baseline fails anyway, because the revision it announces goes backwards.',
	'revisionDelta is the one revision claim this kind can make. A wipe is a committed mutation, so it publishes current + 1, and a core that installs the baseline silently or restarts the numbering fails here.',
	'baseline.disk is read at the baseline publication, before the init the wipe schedules has had a chance to write. That is the only moment the deletion is observable: the re-run init caches the policy it resolves, exactly as a first launch init does, so an envelope existing later is not by itself a failure. What must never exist again is the bytes the wipe started from.',
	'baseline.snapshot.effectivePermissions is the deny-everything-optional reading, spelled the same way OFFLINE_DENY_ALL spells it. It is the half a recorded denial shares with a wipe, which is why nothing here stops at it: promptRequirement is the field that tells the two apart.',
	'expected.afterInit is kernel output: the same /init served to a device with the same pinned identity, the same overrides, and no stored records at all. The wiped device has to settle on the same answer field for field, which is what makes the re-run init part of the wipe rather than something the caller is asked to remember.',
	'the two fixtures of this kind carry different input.intent and identical expected halves. A device that had accepted everything and a device that had refused everything have to be indistinguishable after both wipe, or the wipe left a trace of what it deleted.',
];

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

/**
 * Build the pair that pins what a wipe leaves behind.
 *
 * The device starts as one a native runner can actually reach: it bootstraps over a
 * stored subject, resolves the Europe opt-in rule, and takes `intent` through the real
 * save command, so the receipt the wipe has to delete is a receipt the core wrote. Then
 * it wipes, and the two expectations are read off the kernel -- one by running a device
 * that never decided, one from the contract's own baseline table.
 */
const buildResetConsentFixtures =
	async function buildResetConsentFixtures(): Promise<ResetConsentFixture[]> {
		const decided = await runFixture(inputFor(EU_SCENARIO), {
			intent: { action: 'all' },
		});

		// A device that has decided, in the shape a runner seeds its storage with.
		const wipedInput = (
			intent: CommitIntent
		): ResetConsentFixture['input'] => ({
			...inputFor(EU_SCENARIO, {
				records: storedFor(SUBJECT.europe, {
					choice: decided.after.explicitChoice ?? null,
				}),
			}),
			intent,
		});

		// The same device with nothing it ever decided, which is the comparison the
		// contract offers: not a denial, a device that has not been asked yet.
		const freshInput = inputFor(EU_SCENARIO, {
			hydrated: false,
			records: storedFor(SUBJECT.europe),
		});
		const fresh = await runFixture(freshInput);
		const settled = toFixtureSnapshot(fresh.after, readyFor(freshInput));
		const { revision: _revision, ...afterInit } = settled;

		const cases: {
			id: string;
			description: string;
			intent: CommitIntent;
		}[] = [
			{
				description:
					'A device that accepted every category in scope under the Europe opt-in rule, then wiped. The receipt is gone, the choice prompt is owed again, and the device settles on what a device that was never asked settles on.',
				id: 'reset-consent-opt-in-grants',
				intent: { action: 'all' },
			},
			{
				description:
					'The same Europe rule on a device that recorded a deny-everything choice, then wiped. Its expectation is identical to the accept-all wipe above, field for field, which is the point: a wipe that leaves a recorded denial behind would still differ here, and the subject could never get out of it.',
				id: 'reset-consent-recorded-denial',
				intent: { action: 'necessary' },
			},
		];

		const fixtures = cases.map((testCase) => {
			const input = wipedInput(testCase.intent);
			return {
				description: testCase.description,
				expected: {
					afterInit: { snapshot: structuredClone(afterInit) },
					baseline: {
						disk: { envelope: false, pendingSaves: false, subject: true },
						revisionDelta: 1,
						snapshot: {
							...structuredClone(RESET_BASELINE),
							consentCategories: [...FULL_DECIDED_CATEGORIES],
							effectivePermissions: { ...OFFLINE_DENY_ALL },
							overrides: fixtureOverrides(input.overrides),
							privacySignals: fixturePrivacySignals({
								gpc: {
									active:
										input.privacySignals.gpc.override ??
										input.privacySignals.gpc.detected ??
										false,
									detected: input.privacySignals.gpc.detected ?? false,
									override: input.privacySignals.gpc.override ?? null,
								},
							}),
							subject: { subjectId: SUBJECT.europe },
						},
					},
				},
				id: testCase.id,
				input,
				kind: 'reset-consent' as const,
				notes: RESET_NOTES,
				protocolVersion: PROTOCOL_VERSION,
			} satisfies ResetConsentFixture;
		});

		// The pair claim is the whole reason there are two of these. Asserted here rather
		// than left to the prose, so the day one fixture starts expecting something the
		// other does not, the generator says so instead of two cores agreeing on a
		// difference nobody chose.
		const [first, second] = fixtures as [
			ResetConsentFixture,
			ResetConsentFixture,
		];
		if (stableStringify(first.expected) !== stableStringify(second.expected)) {
			throw new Error(
				'reset-consent fixtures disagree about what a wipe leaves behind. A wipe that records which decision it deleted is not a wipe.'
			);
		}
		return fixtures;
	};

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

/** Drop the contract version a wire carries but a resolution does not repeat. */
const withoutVersion = function withoutVersion(
	wire: PolicyResolutionWire
): Record<string, unknown> {
	const { version: _version, ...rest } = wire;
	return rest;
};

/**
 * Every `/init` response a fixture serves.
 *
 * A single-step fixture serves one. A revision trace serves one per step, plus the
 * bootstrap response the sequence starts from.
 */
const transportsIn = function transportsIn(fixture: Fixture): InitTransport[] {
	const { input } = fixture;
	if (!('steps' in input)) {
		return [input.transport];
	}
	return [
		input.transport,
		...input.steps.flatMap((step) =>
			step.op === 'init' ? [step.transport] : []
		),
	];
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
		for (const transport of transportsIn(fixture)) {
			// A response whose declaration this client refuses never reaches a reader at
			// all, which is the rule under test in the revision trace. Asking a client
			// reader to consume it would assert the opposite of the contract.
			if (
				transport.headers[C15T_POLICY_CONTRACT_HEADER] !== CONTRACT_HEADER_VALUE
			) {
				continue;
			}
			const { policyResolution } = transport.body;
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

/**
 * Refuse a fixture whose hydration claim its own storage contradicts.
 *
 * `ready` is derived from `input.hydrated`, so that field is a claim the runner has to
 * honour rather than a description of what happened. Two ways it can lie: a fixture
 * that says `hydrate()` found an envelope while protected storage holds nothing latches
 * `ready` on a fact no device backs, which is the mirror of the bug the derivation
 * exists to keep visible; and a fixture that says nothing was found while it stores a
 * choice or a dismissal describes a record with no envelope to live in.
 *
 * A pinned subject id is neither. Identity has its own slot, and `native/CONTRACT.md`
 * keeps an envelope refusal from costing a device its identity, which is exactly what
 * lets a first launch carry an id and still hydrate into nothing.
 */
const assertHydrationClaims = function assertHydrationClaims(
	fixtures: readonly Fixture[]
): void {
	for (const fixture of fixtures) {
		const { hydrated, storedRecords } = fixture.input;
		const recordsInsideEnvelope =
			storedRecords.choice !== null || storedRecords.noticeDismissal !== null;
		if (!hydrated && recordsInsideEnvelope) {
			throw new Error(
				`${fixture.id}: input.hydrated is false but storedRecords carries a choice or a dismissal, which only exists inside a stored envelope.`
			);
		}
		if (hydrated && !recordsInsideEnvelope && storedRecords.subject === null) {
			throw new Error(
				`${fixture.id}: input.hydrated is true but protected storage holds nothing, so hydrate() had no envelope to latch ready with. Say "hydrated": false and let the init response carry the flag.`
			);
		}
	}
};

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

/** Twelve hex bytes, for re-minting a pinned id through the real generator. */
const hexBytes = function hexBytes(hex: string): number[] {
	const bytes: number[] = [];
	for (let index = 0; index < hex.length; index += 2) {
		const byte = Number.parseInt(hex.slice(index, index + 2), 16);
		if (Number.isNaN(byte)) {
			throw new Error(`${hex} is not hex`);
		}
		bytes.push(byte);
	}
	if (bytes.length !== 12) {
		throw new Error(`${hex} must be exactly 12 random bytes`);
	}
	return bytes;
};

/**
 * Run the real generator against a pinned clock reading and a pinned draw.
 *
 * `generateSubjectId` fills all twenty bytes from the CSPRNG and writes the timestamp
 * over the first eight, so replacing the draw decides the identity and `Date.now` decides
 * the offset, which together are the whole encoding. Everything is restored: this runs
 * inside the same process that generates the fixtures, and a leaked clock stub there
 * would quietly restamp every timestamp in the run.
 */
const mintFromEntropy = function mintFromEntropy(
	randomHex: string,
	clock: number
): string {
	const tail = hexBytes(randomHex);
	const realDateNow = Date.now;
	const cryptoObject = globalThis.crypto;
	const realGetRandomValues = cryptoObject.getRandomValues.bind(cryptoObject);
	Date.now = () => clock;
	cryptoObject.getRandomValues = function getRandomValues<
		TypeArray extends ArrayBufferView | null,
	>(array: TypeArray): TypeArray {
		if (array && 'length' in array) {
			array.fill(0);
			const view = new Uint8Array(
				array.buffer,
				array.byteOffset,
				array.byteLength
			);
			tail.forEach((byte, index) => {
				view[view.byteLength - 12 + index] = byte;
			});
		}
		return array;
	} as typeof cryptoObject.getRandomValues;
	try {
		return generateSubjectId();
	} finally {
		Date.now = realDateNow;
		cryptoObject.getRandomValues = realGetRandomValues;
	}
};

/**
 * Refuse a fixture that carries a subject id the producer would reject.
 *
 * This is the reason the ids above are minted rather than invented. A save-body fixture
 * pins a `POST /subjects` request byte for byte, and both native cores are graded against
 * it, so a UUID-shaped id in one of these files certifies a request the backend answers
 * with `INPUT_VALIDATION_FAILED`: two cores implementing a save that can never be
 * accepted, green in CI, broken on every device. The same id is now also unreadable on
 * the read side, where a core that finds one throws the envelope stored under it.
 *
 * The check is `isValidSubjectId`, the client-side form of `subjectIdSchema`, walked over
 * every `subjectId` in every emitted fixture rather than over the `SUBJECT` table alone,
 * because an id can reach a fixture from a scenario, a stored record, or a kernel
 * response, and only the emitted bytes are what a native runner reads.
 */
const assertSubjectIdsAreProducible = function assertSubjectIdsAreProducible(
	fixtures: readonly Fixture[]
): void {
	for (const [name, mint] of Object.entries(SUBJECT_MINTS)) {
		const pinned = SUBJECT[name as keyof typeof SUBJECT];
		const minted = mintFromEntropy(mint.randomHex, mint.clock);
		if (pinned !== minted) {
			throw new Error(
				`SUBJECT.${name} is ${pinned}, but minting at clock ${String(mint.clock)} with entropy ${mint.randomHex} writes ${minted}. Mint fixture ids, do not invent them.`
			);
		}
	}

	const offenders = new Set<string>();
	const walk = function walk(value: unknown, where: string): void {
		if (Array.isArray(value)) {
			value.forEach((item, index) => walk(item, `${where}[${String(index)}]`));
			return;
		}
		if (value === null || typeof value !== 'object') {
			return;
		}
		for (const [key, item] of Object.entries(
			value as Record<string, unknown>
		)) {
			if (key === 'subjectId' && typeof item === 'string') {
				if (!isValidSubjectId(item)) {
					offenders.add(`${where}.subjectId=${item}`);
				}
				continue;
			}
			walk(item, `${where}.${key}`);
		}
	};
	for (const fixture of fixtures) {
		walk(fixture, fixture.id);
	}
	if (offenders.size > 0) {
		throw new Error(
			`Fixtures carry subject ids the backend rejects (subjectIdSchema requires ^sub_[1-9A-HJ-NP-Za-km-z]+$): ${[...offenders].sort().join(', ')}. Mint them with generateSubjectId at the pinned clock, as the SUBJECT table does. A fixture body the producer refuses certifies a save that can only fail.`
		);
	}
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
			...(await buildNativeEnvelopeFixtures()),
			...(await buildResetConsentFixtures()),
		];
		// Last, because the trace drives the same kernel through a sequence and a
		// half-finished save from here would land inside the next generation pass.
		fixtures.push(...(await buildRevisionTraceFixtures()));
	} finally {
		Date.now = realDateNow;
	}
	assertProtocolVersions(
		fixtures,
		outDir,
		process.argv.includes('--allow-protocol-change')
	);
	assertWiresReadable(fixtures);
	assertHydrationClaims(fixtures);
	assertSubjectIdsAreProducible(fixtures);
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
