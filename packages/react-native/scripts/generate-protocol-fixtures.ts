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
 * Three kinds of fixture land in `native/protocol/`:
 *
 * - `evaluation-*.json` — policy resolution plus stored records in, snapshot
 *   fields out.
 * - `save-body-*.json` — state plus action in, the exact kernel `SavePayload`
 *   and the exact `POST /subjects` body out.
 * - `storage-*.json` — serialized envelope round-trip: decode, re-encode, and
 *   the snapshot the decoded records produce.
 *
 * Each file carries a complete `input` and a literal `expected`, so a native
 * test reads the file, applies `input`, and compares values. Nothing has to be
 * re-derived or reinterpreted.
 *
 * Determinism rules this script depends on: the clock is always an input, the
 * subject id is always supplied rather than generated, the language override is
 * always pinned, and every save passes an explicit `actionAt`.
 *
 * IAB TCF is out of scope: no TC string, no GVL, and the snapshot `iab` slot is
 * emitted as `null`.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	buildSubjectPostBody,
	createConsentKernel,
	policyRulePresets,
	resolvePolicyRules,
	validateExplicitChoice,
} from '@c15t/core';
import type {
	ConsentSnapshot as KernelSnapshot,
	HydrationRecords,
	KernelUser,
	PolicyResolution,
	PolicyRule,
	SaveInput,
	SavePayload,
} from '@c15t/core';

import type { CommitIntent } from '../src/protocol/commit';
import {
	DEFAULT_NATIVE_LANGUAGE,
	defaultNativeOverrides,
} from '../src/protocol/overrides';
import type { NativeOverrides } from '../src/protocol/overrides';
import type {
	ConsentSnapshot,
	SnapshotResolution,
} from '../src/protocol/snapshot';
import { PROTOCOL_VERSION } from '../src/protocol/version';

// -- Fixed inputs ------------------------------------------------------------

/** Evaluation clock for every fixture. Nothing here reads the wall clock. */
const NOW = 1_770_000_000_000;

/** Confirmation time for saves: one second before the evaluation clock. */
const ACTION_AT = NOW - 1_000;

/** Domain the `POST /subjects` body is built for. */
const DOMAIN = 'app.example.com';

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

// -- Shapes ------------------------------------------------------------------

/**
 * The state a fixture replays: what the native core has to work with before
 * the asserted step runs.
 */
interface ScenarioInput {
	/** Policy pack the producer serves, verbatim. */
	policyRules: readonly PolicyRule[];
	/** Geo the backend resolved for this subject. */
	geo: { country: string | null; region: string | null };
	/** Pinned language, so translation selection never varies. */
	language: string;
	/** Effective Global Privacy Control signal. */
	gpc: boolean;
	/** Signed policy token the init response carried, when it carried one. */
	policySnapshotToken: string | null;
	/** Records already in protected storage, applied through hydration. */
	storedRecords: HydrationRecords | null;
	/** Identified user, when the app has one. */
	user: KernelUser | null;
}

interface EvaluationFixture {
	protocolVersion: number;
	kind: 'evaluation';
	id: string;
	description: string;
	notes: string[];
	input: ScenarioInput & { hydrated: boolean };
	expected: {
		policyResolution: SnapshotResolution & {
			/** Which matcher picked the rule, for explainability. */
			matchedBy: PolicyResolution['matchedBy'] | null;
		};
		snapshot: ConsentSnapshot;
	};
}

interface SaveBodyFixture {
	protocolVersion: number;
	kind: 'save-body';
	id: string;
	description: string;
	notes: string[];
	input: ScenarioInput & {
		hydrated: boolean;
		actionAt: number;
		domain: string;
		intent: CommitIntent;
	};
	expected: {
		snapshotBefore: ConsentSnapshot;
		snapshotAfter: ConsentSnapshot;
		savePayload: SavePayload;
		request: { method: 'POST'; path: string; body: unknown };
	};
}

interface StorageFixture {
	protocolVersion: number;
	kind: 'storage';
	id: string;
	description: string;
	notes: string[];
	input: ScenarioInput & { storedEnvelope: string };
	expected: {
		decode:
			| { ok: true; records: { subject: unknown; choice: unknown } }
			| { ok: false; issues: unknown };
		reEncoded: string | null;
		snapshot: ConsentSnapshot;
	};
}

type Fixture = EvaluationFixture | SaveBodyFixture | StorageFixture;

// -- Kernel harness ---------------------------------------------------------

/**
 * Build a kernel from a scenario, optionally applying a save.
 *
 * `records` overrides the scenario's stored records, which is how the storage
 * fixtures feed a decoded envelope back in, and how the fail-closed case feeds
 * nothing.
 */
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

const runKernel = async function runKernel(
	input: ScenarioInput,
	options: {
		hydrated?: boolean;
		policyPending?: boolean;
		records?: HydrationRecords | null;
		/** Dismiss the current notice before the snapshot is read. */
		dismiss?: boolean;
		intent?: CommitIntent;
		actionAt?: number;
	} = {}
): Promise<{
	snapshot: KernelSnapshot;
	before: KernelSnapshot;
	payload: SavePayload | null;
}> {
	const resolution = resolvePolicyRules({
		countryCode: input.geo.country,
		regionCode: input.geo.region,
		rules: [...input.policyRules],
	});
	const payloads: SavePayload[] = [];
	const kernel = createConsentKernel({
		initialOverrides: {
			country: input.geo.country ?? undefined,
			language: input.language,
			region: input.geo.region ?? undefined,
		},
		initialPolicyPending: options.policyPending ?? false,
		initialPolicyResolution: options.policyPending
			? undefined
			: (resolution as PolicyResolution),
		initialPolicySnapshotToken: input.policySnapshotToken ?? undefined,
		initialPrivacySignals: { gpc: input.gpc },
		initialRecords: {
			...(options.records === undefined
				? (input.storedRecords ?? {})
				: options.records),
			now: NOW,
		},
		initialUser: input.user ?? undefined,
		now: NOW,
		transport: {
			save: (payload) => {
				payloads.push(payload);
				return Promise.resolve({ ok: true, subjectId: payload.subjectId });
			},
		},
	});
	const before = kernel.getSnapshot();
	let payload: SavePayload | null = null;
	if (options.intent) {
		await kernel.commands.save(saveInputFor(options.intent), {
			actionAt: options.actionAt ?? ACTION_AT,
		});
		payload = payloads[0] ?? null;
	}
	if (options.dismiss) {
		await kernel.commands.dismissNotice();
	}
	const snapshot = kernel.getSnapshot();
	kernel.dispose();
	if (snapshot.model === 'iab') {
		throw new Error('Fixture produced an IAB model, which is out of scope.');
	}
	return { before, payload, snapshot };
};

// -- Projection -------------------------------------------------------------

const NOTES = [
	'Compare parsed values, not serialized bytes: object key order is not part of the contract.',
	'revision is a monotonic counter that starts at 0 and bumps once per committed mutation, so the pinned numbers are the reference numbering.',
	'evaluatedAt equals input.now, and ready equals input.hydrated. Both are native lifecycle facts, not kernel output.',
	'error is null in every fixture: no fixture exercises a transport failure.',
	'Any field this file does not mention must not be invented. Unknown wire values fail closed.',
];

/**
 * Project a kernel snapshot onto the mobile snapshot shape.
 *
 * This is the mapping the native cores implement, written down once so the
 * fixtures and the TypeScript side cannot drift apart. `ready` and `error` are
 * native lifecycle facts the kernel does not model, so the caller supplies
 * `hydrated` and the error stays `null` for every fixture here.
 */
const nativeOverrides = function nativeOverrides(overrides: {
	country?: string;
	language?: string;
	region?: string;
}): NativeOverrides {
	// The default pins the fields a device without context holds, so the
	// projection only has to say what the kernel actually resolved.
	return {
		...defaultNativeOverrides(overrides.language ?? DEFAULT_NATIVE_LANGUAGE),
		country: overrides.country ?? null,
		region: overrides.region ?? null,
	};
};

const snapshotResolution = function snapshotResolution(
	resolution: PolicyResolution
): SnapshotResolution {
	return {
		fingerprint:
			resolution.status === 'matched' ? resolution.fingerprints.policy : null,
		policyId: resolution.status === 'matched' ? resolution.policyId : null,
		status: resolution.status,
	};
};

const toNativeSnapshot = function toNativeSnapshot(
	snapshot: KernelSnapshot,
	hydrated: boolean
): ConsentSnapshot {
	const { overrides } = snapshot;
	const { resolution } = snapshot;
	if (snapshot.model === 'iab') {
		throw new Error('Fixture produced an IAB model, which is out of scope.');
	}
	if (snapshot.optOutDirectives.length > 0) {
		throw new Error(
			'Fixture produced a standing privacy directive, which mobile does not record in this phase.'
		);
	}
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
		optOutDirectives: [],
		overrides: nativeOverrides(overrides),
		policyPending: snapshot.policyPending,
		policySnapshotToken: snapshot.policySnapshotToken,
		privacySignals: {
			gpc: snapshot.privacySignals.gpc.active,
			msa: false,
		},
		promptRequirement: { ...snapshot.promptRequirement },
		ready: hydrated,
		resolution: snapshotResolution(resolution),
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

const expectedPolicyResolution = function expectedPolicyResolution(
	resolution: PolicyResolution
): EvaluationFixture['expected']['policyResolution'] {
	return {
		...snapshotResolution(resolution),
		matchedBy: resolution.status === 'matched' ? resolution.matchedBy : null,
	};
};

// -- Scenarios --------------------------------------------------------------

const EU_SCENARIO: ScenarioInput = {
	geo: { country: 'DE', region: null },
	gpc: false,
	language: 'en',
	policyRules: POLICY_RULES,
	policySnapshotToken: 'tok-europe-opt-in',
	storedRecords: { now: NOW, subject: { subjectId: 'sub-eu-1' } },
	user: null,
};

const CCPA_SCENARIO: ScenarioInput = {
	geo: { country: 'US', region: 'CA' },
	gpc: false,
	language: 'en',
	policyRules: POLICY_RULES,
	policySnapshotToken: 'tok-california-opt-out',
	storedRecords: { now: NOW, subject: { subjectId: 'sub-ccpa-1' } },
	user: null,
};

const GPC_SCENARIO: ScenarioInput = {
	...CCPA_SCENARIO,
	gpc: true,
	storedRecords: { now: NOW, subject: { subjectId: 'sub-gpc-1' } },
};

/** Only the California rule is configured, so Germany matches nothing. */
const NO_MATCH_SCENARIO: ScenarioInput = {
	geo: { country: 'DE', region: 'BE' },
	gpc: false,
	language: 'en',
	policyRules: [policyRulePresets.californiaOptOut()],
	policySnapshotToken: null,
	storedRecords: { now: NOW, subject: { subjectId: 'sub-nomatch-1' } },
	user: null,
};

const NOTICE_SCENARIO: ScenarioInput = {
	geo: { country: 'GB', region: null },
	gpc: false,
	language: 'en',
	policyRules: [NOTICE_RULE],
	policySnapshotToken: 'tok-notice-only',
	storedRecords: { now: NOW, subject: { subjectId: 'sub-notice-1' } },
	user: null,
};

const subjectOf = function subjectOf(
	scenario: ScenarioInput
): HydrationRecords {
	return scenario.storedRecords ?? { now: NOW };
};

const withChoice = function withChoice(
	scenario: ScenarioInput,
	choice: HydrationRecords['choice']
): ScenarioInput {
	return {
		...scenario,
		storedRecords: { ...subjectOf(scenario), choice },
	};
};

// -- Fixtures ---------------------------------------------------------------

const buildEvaluationFixtures =
	async function buildEvaluationFixtures(): Promise<EvaluationFixture[]> {
		const cases: {
			id: string;
			description: string;
			input: ScenarioInput;
			hydrated: boolean;
		}[] = [
			{
				description:
					'Germany resolves the Europe opt-in rule. With no stored choice every optional category is denied and a choice prompt is owed, so the banner is the surface to render.',
				hydrated: true,
				id: 'eu-opt-in',
				input: EU_SCENARIO,
			},
			{
				description:
					'California resolves the CCPA opt-out rule. Optional categories are allowed until denied, no prompt is owed, and no surface renders.',
				hydrated: true,
				id: 'us-ccpa-opt-out',
				input: CCPA_SCENARIO,
			},
			{
				description:
					'Germany with only the California rule configured resolves to no-match. The evaluator falls back to the safe opt-in rule, denies every optional category, and still reports a rule the user can be shown.',
				hydrated: true,
				id: 'no-rule-matched',
				input: NO_MATCH_SCENARIO,
			},
			{
				description:
					'An active GPC signal under the CCPA opt-out rule denies marketing and measurement even though the model would allow them, and records the reason on the snapshot.',
				hydrated: true,
				id: 'gpc-signal-present',
				input: GPC_SCENARIO,
			},
			{
				description:
					'A notice-only rule with no stored dismissal still owes the notice, so the banner renders and permissions follow the opt-out default.',
				hydrated: true,
				id: 'notice-pending',
				input: NOTICE_SCENARIO,
			},
		];
		const fixtures: EvaluationFixture[] = await Promise.all(
			cases.map(async (testCase) => {
				const { snapshot } = await runKernel(testCase.input, {
					hydrated: testCase.hydrated,
				});
				return {
					description: testCase.description,
					expected: {
						policyResolution: expectedPolicyResolution(
							resolvePolicyRules({
								countryCode: testCase.input.geo.country,
								regionCode: testCase.input.geo.region,
								rules: [...testCase.input.policyRules],
							})
						),
						snapshot: toNativeSnapshot(snapshot, testCase.hydrated),
					},
					id: `evaluation-${testCase.id}`,
					input: { ...testCase.input, hydrated: testCase.hydrated },
					kind: 'evaluation',
					notes: NOTES,
					protocolVersion: PROTOCOL_VERSION,
				};
			})
		);

		// The notice-dismissed pair needs the dismissal the core itself recorded,
		// so it is produced by the real command instead of a hand-written
		// fingerprint. The second run replays that record through hydration.
		// The dismissal has to come from the real command so its fingerprint
		// and timestamp are the core's, not a hand-written guess.
		const noticePending = await runKernel(NOTICE_SCENARIO, { dismiss: true });
		const dismissed = await runKernel(NOTICE_SCENARIO, {
			records: {
				...subjectOf(NOTICE_SCENARIO),
				noticeDismissal: noticePending.snapshot.noticeDismissal ?? undefined,
			},
		});
		fixtures.push({
			description:
				'The same notice-only rule after the notice was dismissed: the dismissal record is honoured, no interaction is owed, no surface renders, and permissions are unchanged from the undismissed run.',
			expected: {
				policyResolution: expectedPolicyResolution(
					resolvePolicyRules({
						countryCode: NOTICE_SCENARIO.geo.country,
						regionCode: NOTICE_SCENARIO.geo.region,
						rules: [NOTICE_RULE],
					})
				),
				snapshot: toNativeSnapshot(dismissed.snapshot, true),
			},
			id: 'evaluation-notice-dismissed',
			input: {
				...NOTICE_SCENARIO,
				hydrated: true,
				storedRecords: {
					...subjectOf(NOTICE_SCENARIO),
					noticeDismissal: noticePending.snapshot.noticeDismissal ?? undefined,
				},
			},
			kind: 'evaluation',
			notes: NOTES,
			protocolVersion: PROTOCOL_VERSION,
		});
		return fixtures;
	};

const SAVE_NOTES = [
	...NOTES,
	'savePayload is what the pending queue must persist before the request, byte-for-byte, and a replay must resend it unchanged after a later init changes policy.',
	'request.body is the POST /subjects body. tcString is absent because IAB is out of scope: never add the key.',
	'consentAction and uiSource come from the kernel, not from the intent name: a partial save is custom even when the user turned everything on.',
];

const buildSaveBodyFixtures = async function buildSaveBodyFixtures(): Promise<
	SaveBodyFixture[]
> {
	const grantedEverywhere = withChoice(EU_SCENARIO, null);
	const cases: {
		id: string;
		description: string;
		input: ScenarioInput;
		intent: CommitIntent;
	}[] = [
		{
			description:
				'Accept all under the Europe opt-in rule. The receipts carry the choice fingerprint, the payload confirms exactly the four optional categories, and the wire body sends both the complete preference map and the receipts for this act.',
			id: 'all',
			input: grantedEverywhere,
			intent: { action: 'all' },
		},
		{
			description:
				'Reject all under the Europe opt-in rule. Necessary stays permitted, every optional category gets an explicit false receipt, and no optional category is left undecided.',
			id: 'necessary',
			input: grantedEverywhere,
			intent: { action: 'necessary' },
		},
		{
			description:
				'An explicit partial save under the Europe opt-in rule confirms only marketing and measurement. Functionality and experience get no receipt, so the kernel must not renew or invent them, and consentAction is custom.',
			id: 'explicit-partial',
			input: grantedEverywhere,
			intent: {
				action: 'explicit',
				consents: { marketing: true, measurement: false },
			},
		},
		{
			description:
				'Accept all under the CCPA opt-out rule while GPC is active. The receipts record the grant the subject made, while the effective permissions and the decision inputs carry the GPC denial, so the backend sees both facts.',
			id: 'ccpa-gpc',
			input: GPC_SCENARIO,
			intent: { action: 'all' },
		},
	];
	const fixtures: SaveBodyFixture[] = await Promise.all(
		cases.map(async (testCase) => {
			const { before, payload, snapshot } = await runKernel(testCase.input, {
				intent: testCase.intent,
			});
			if (!payload) {
				throw new Error(`No save payload captured for ${testCase.id}.`);
			}
			return {
				description: testCase.description,
				expected: {
					request: {
						body: buildSubjectPostBody(payload, { domain: DOMAIN }),
						method: 'POST',
						path: '/subjects',
					},
					savePayload: payload,
					snapshotAfter: toNativeSnapshot(snapshot, true),
					snapshotBefore: toNativeSnapshot(before, true),
				},
				id: `save-body-${testCase.id}`,
				input: {
					...testCase.input,
					actionAt: ACTION_AT,
					domain: DOMAIN,
					hydrated: true,
					intent: testCase.intent,
				},
				kind: 'save-body',
				notes: SAVE_NOTES,
				protocolVersion: PROTOCOL_VERSION,
			};
		})
	);
	return fixtures;
};

/** Serialized v3 envelope, in the field order the JSON codec emits. */
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
	'When decode fails, apply nothing and keep the in-memory records. expected.snapshot is the deny-all pending snapshot, not a guess at what the bytes meant.',
];

const buildStorageFixtures = async function buildStorageFixtures(): Promise<
	StorageFixture[]
> {
	const grants = await runKernel(EU_SCENARIO, {
		intent: { action: 'all' },
	});
	if (!grants.payload) {
		throw new Error('No save payload captured for the grants fixture.');
	}
	const grantEnvelope: StoredEnvelope = {
		categories: grants.payload.choice.categories,
		subject: { subjectId: 'sub-eu-1' },
		version: 3,
	};

	const partial = await runKernel(EU_SCENARIO, {
		intent: {
			action: 'explicit',
			consents: { marketing: false, measurement: true },
		},
	});
	if (!partial.payload) {
		throw new Error('No save payload captured for the partial fixture.');
	}
	const partialEnvelope: StoredEnvelope = {
		categories: partial.payload.choice.categories,
		subject: { subjectId: 'sub-eu-2' },
		version: 3,
	};

	const cases: {
		id: string;
		description: string;
		envelope: StoredEnvelope;
		scenario: ScenarioInput;
	}[] = [
		{
			description:
				'A complete opt-in grant round-trips: four receipts with the Europe choice fingerprint decode, hydrate, and re-encode to the same string, and the snapshot shows every optional category allowed with no prompt owed.',
			envelope: grantEnvelope,
			id: 'explicit-grants',
			scenario: EU_SCENARIO,
		},
		{
			description:
				'A partial stored record keeps absent categories absent. Measurement is allowed, marketing is denied, functionality and experience take the opt-in default, and re-encoding must not write the categories the subject never touched.',
			envelope: partialEnvelope,
			id: 'partial-denials',
			scenario: {
				...EU_SCENARIO,
				storedRecords: { now: NOW, subject: { subjectId: 'sub-eu-2' } },
			},
		},
	];
	const readable: StorageFixture[] = await Promise.all(
		cases.map(async (testCase) => {
			const serialized = encodeEnvelope(testCase.envelope);
			const decoded = validateExplicitChoice(JSON.parse(serialized), NOW);
			if (!decoded.ok) {
				throw new Error(
					`${testCase.id} failed to decode: ${JSON.stringify(decoded.issues)}`
				);
			}
			const records: HydrationRecords = {
				choice: decoded.record,
				now: NOW,
				subject: testCase.envelope.subject as HydrationRecords['subject'],
			};
			const { snapshot } = await runKernel(testCase.scenario, {
				records,
			});
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
			return {
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
					snapshot: toNativeSnapshot(snapshot, true),
				},
				id: `storage-${testCase.id}`,
				input: {
					...testCase.scenario,
					storedEnvelope: serialized,
				},
				kind: 'storage',
				notes: STORAGE_NOTES,
				protocolVersion: PROTOCOL_VERSION,
			};
		})
	);

	// A stored envelope whose confirmation time is in the future must fail
	// closed: nothing is applied, and the snapshot is the pending deny-all one.
	const broken = await runKernel(EU_SCENARIO, {
		policyPending: true,
		records: null,
	});
	const brokenEnvelope: StoredEnvelope = {
		categories: {
			marketing: {
				basis: { fingerprint: 'fp-europe-choice', kind: 'choice-v1' },
				confirmedAt: NOW + 60_000,
				value: true,
			},
		},
		subject: { subjectId: 'sub-eu-3' },
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
	const fixtures: StorageFixture[] = [...readable];
	fixtures.push({
		description:
			'A stored receipt confirmed in the future is unreadable. The decode fails, no record is applied, and the snapshot is the deny-all pending one with a choice prompt still owed.',
		expected: {
			decode: { issues: brokenDecoded.issues, ok: false },
			reEncoded: null,
			snapshot: toNativeSnapshot(broken.snapshot, false),
		},
		id: 'storage-invalid-record',
		input: {
			...EU_SCENARIO,
			storedEnvelope: brokenSerialized,
			storedRecords: null,
		},
		kind: 'storage',
		notes: STORAGE_NOTES,
		protocolVersion: PROTOCOL_VERSION,
	});
	return fixtures;
};

// -- Writer -----------------------------------------------------------------

const writeFixtures = async function writeFixtures(): Promise<void> {
	const here = dirname(fileURLToPath(import.meta.url));
	const outDir = resolve(here, '..', '..', '..', 'native', 'protocol');
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
	for (const fixture of fixtures) {
		writeFileSync(
			resolve(outDir, `${fixture.id}.json`),
			// Tab-indented to match the repository formatter, so a regenerated fixture
			// is a no-op for `bun fmt`.
			`${JSON.stringify(fixture, null, '\t')}\n`,
			'utf8'
		);
	}
	// Format the output with the repository formatter. Oxfmt collapses short
	// arrays and switches indentation to tabs, so writing without this step
	// would leave every regenerated fixture dirty for autofix.ci to fix.
	const format = spawnSync('bunx', ['oxfmt', outDir], {
		cwd: resolve(here, '..', '..', '..'),
		stdio: 'ignore',
	});
	if (format.status !== 0) {
		throw new Error('Oxfmt failed on the generated fixtures.');
	}
	console.log(
		`Wrote ${String(fixtures.length)} fixtures to ${outDir.replace(`${process.cwd()}/`, '')}`
	);
	for (const fixture of fixtures) {
		console.log(`  ${fixture.kind.padEnd(11)} ${fixture.id}.json`);
	}
};

await writeFixtures();
