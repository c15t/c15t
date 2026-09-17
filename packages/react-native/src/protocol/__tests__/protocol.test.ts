/**
 * Guards the two things the native cores depend on: the version handshake,
 * and the shape of every snapshot the fixtures claim.
 *
 * The fixture assertions are the important half. A fixture that drops a key,
 * or fills `iab` with something other than `null`, would silently move the
 * contract for Swift and Kotlin, because both read these files as truth.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decisionInputsMatchOverrides } from '@c15t/core';
import type { RememberedDecisionInputs } from '@c15t/core';
import { describe, expect, test } from 'vitest';

import type {
	CommitFailureReason,
	NativeOverrides,
	NativePrivacySignals,
} from '../index';
import {
	defaultNativeOverrides,
	describeProtocolMismatch,
	isProtocolVersionSupported,
	MAX_SUPPORTED_PROTOCOL_VERSION,
	MIN_SUPPORTED_PROTOCOL_VERSION,
	NATIVE_C15T_MODULE_NAME,
	NATIVE_EVENT_NAMES,
	PROTOCOL_VERSION,
} from '../index';

const FIXTURE_DIR = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../../../../native/protocol'
);

/**
 * The manifest the Swift and Kotlin runners enumerate. It describes the fixtures,
 * so it is not one.
 */
const INDEX_FILE = 'index.json';

/** Field set of the mobile snapshot, exactly as `native/CONTRACT.md` lists it. */
const SNAPSHOT_KEYS = [
	'activeUI',
	'consentCategories',
	'effectivePermissions',
	'error',
	'evaluatedAt',
	'explicitChoice',
	'iab',
	'location',
	'model',
	'nextDeadline',
	'optOutDirectives',
	'overrides',
	'policyPending',
	'policySnapshotToken',
	'privacySignals',
	'promptRequirement',
	'ready',
	'resolution',
	'restrictions',
	'revision',
	'subject',
	'translations',
].sort();

const PERMISSION_KEYS = [
	'experience',
	'functionality',
	'marketing',
	'measurement',
	'necessary',
].sort();

/** Field set of `NativeOverrides`, as `native/CONTRACT.md` lists it. */
const OVERRIDE_KEYS = ['country', 'gpc', 'language', 'region'].sort();

/** Field set of the `gpc` member of `NativePrivacySignals`. */
const GPC_SIGNAL_KEYS = ['active', 'detected', 'override'].sort();

const MANDATED_FIXTURES = [
	'evaluation-eu-opt-in',
	'evaluation-gpc-signal-present',
	'evaluation-no-rule-matched',
	'evaluation-notice-dismissed',
	'evaluation-us-ccpa-opt-out',
	'save-body-explicit-partial',
	'storage-explicit-grants',
];

interface FixtureFile {
	id: string;
	kind: 'evaluation' | 'save-body' | 'storage';
	protocolVersion: number;
	description: string;
	notes: string[];
	input: Record<string, unknown>;
	expected: Record<string, unknown>;
}

interface IndexEntry {
	bytes: number;
	file: string;
	id: string;
	kind: 'evaluation' | 'save-body' | 'storage';
	protocolVersion: number;
	sha256: string;
}

interface FixtureIndex {
	clock: number;
	count: number;
	fixtures: IndexEntry[];
	policyContractHeader: string;
	protocolVersion: number;
}

const readIndex = function readIndex(): FixtureIndex {
	return JSON.parse(
		readFileSync(resolve(FIXTURE_DIR, INDEX_FILE), 'utf8')
	) as FixtureIndex;
};

/**
 * Enumerate through the index rather than the directory, exactly as a native runner
 * does. A file the index does not name is then invisible here, which is what the
 * `the index is the whole directory` assertion catches.
 */
const readFixtures = function readFixtures(): FixtureFile[] {
	return readIndex().fixtures.map(
		(entry) =>
			JSON.parse(
				readFileSync(resolve(FIXTURE_DIR, entry.file), 'utf8')
			) as FixtureFile
	);
};

/** Every snapshot a fixture claims, paired with the case that claims it. */
const snapshotsIn = function snapshotsIn(
	fixture: FixtureFile
): Record<string, Record<string, unknown>> {
	if (fixture.kind === 'evaluation' || fixture.kind === 'storage') {
		return { snapshot: fixture.expected.snapshot as Record<string, unknown> };
	}
	return {
		snapshotAfter: fixture.expected.snapshotAfter as Record<string, unknown>,
		snapshotBefore: fixture.expected.snapshotBefore as Record<string, unknown>,
	};
};

describe('protocol handshake', () => {
	test('the current protocol sits inside the supported range', () => {
		expect(PROTOCOL_VERSION).toBe(MAX_SUPPORTED_PROTOCOL_VERSION);
		expect(isProtocolVersionSupported(PROTOCOL_VERSION)).toBe(true);
		expect(isProtocolVersionSupported(MIN_SUPPORTED_PROTOCOL_VERSION)).toBe(
			true
		);
	});

	test('versions outside the range are rejected', () => {
		expect(isProtocolVersionSupported(0)).toBe(false);
		expect(isProtocolVersionSupported(MIN_SUPPORTED_PROTOCOL_VERSION - 1)).toBe(
			false
		);
		expect(isProtocolVersionSupported(MAX_SUPPORTED_PROTOCOL_VERSION + 1)).toBe(
			false
		);
	});

	test('a version the native core cannot state cleanly is unsupported', () => {
		expect(isProtocolVersionSupported(Number.NaN)).toBe(false);
		expect(isProtocolVersionSupported(1.5)).toBe(false);
		expect(isProtocolVersionSupported(Number.POSITIVE_INFINITY)).toBe(false);
	});

	test('the mismatch message names both sides and the fix', () => {
		const message = describeProtocolMismatch(99);
		expect(message).toContain('99');
		expect(message).toContain('@c15t/react-native');
		expect(message).toContain('Rebuild');
		expect(message).toContain(
			`${MIN_SUPPORTED_PROTOCOL_VERSION} to ${MAX_SUPPORTED_PROTOCOL_VERSION}`
		);
	});
});

describe('native boundary constants', () => {
	test('the module name matches the TurboModule lookup', () => {
		expect(NATIVE_C15T_MODULE_NAME).toBe('C15t');
	});

	test('a device with no app context has no overrides and one language', () => {
		expect(defaultNativeOverrides('de-DE')).toEqual({
			country: null,
			gpc: null,
			language: 'de-DE',
			region: null,
		});
	});

	test('overrides are the four kernel fields and no invented fifth', () => {
		// `test` was a field the first draft of the contract invented. Publisher
		// test mode is a client option, not an override, and it never reaches a
		// save body, so a native core carrying it has one field too many.
		expect(Object.keys(defaultNativeOverrides('en')).sort()).toEqual([
			'country',
			'gpc',
			'language',
			'region',
		]);
	});

	test('the native failure vocabulary names an un-bootstrapped core', () => {
		// Runtime cannot see a union, so this is the compile-time half: both native
		// bridges send this exact string, and if the protocol ever drops it the
		// assignment stops type-checking.
		const fromAndroidBridge: CommitFailureReason = 'not-bootstrapped';
		const fromIosBridge: CommitFailureReason = 'not-bootstrapped';
		expect([fromAndroidBridge, fromIosBridge]).toEqual([
			'not-bootstrapped',
			'not-bootstrapped',
		]);
	});

	test('the event set is the three names the contract allows', () => {
		expect([...NATIVE_EVENT_NAMES].sort()).toEqual([
			'error',
			'initialized',
			'snapshot',
		]);
	});
});

describe('protocol fixtures', () => {
	const index = readIndex();
	const fixtures = readFixtures();

	test('the index is the whole directory and pins every file', () => {
		const onDisk = readdirSync(FIXTURE_DIR)
			.filter((name) => name.endsWith('.json') && name !== INDEX_FILE)
			.sort();
		expect(index.fixtures.map((entry) => entry.file).sort()).toEqual(onDisk);
		expect(index.count).toBe(onDisk.length);
		expect(index.fixtures.length).toBe(index.count);
	});

	test('every index entry names its own file and the current protocol', () => {
		for (const entry of index.fixtures) {
			expect(entry.id).toBe(entry.file.replace(/\.json$/u, ''));
			expect(entry.file.startsWith(`${entry.kind}-`)).toBe(true);
			// The generator refuses to write a fixture for any other version, so a
			// stale file here means it was edited by hand after generation.
			expect(entry.protocolVersion).toBe(PROTOCOL_VERSION);
		}
		expect(index.protocolVersion).toBe(PROTOCOL_VERSION);
	});

	test('every fixture file is the one the index hashed', () => {
		for (const entry of index.fixtures) {
			const bytes = readFileSync(resolve(FIXTURE_DIR, entry.file));
			expect(bytes.byteLength).toBe(entry.bytes);
			expect(createHash('sha256').update(bytes).digest('hex')).toBe(
				entry.sha256
			);
		}
	});
	const allSnapshots = (): Record<string, unknown>[] =>
		fixtures.flatMap((fixture) => Object.values(snapshotsIn(fixture)));
	const permissionsOf = (snapshot: Record<string, unknown>) =>
		snapshot.effectivePermissions as Record<string, unknown>;

	test('every mandated scenario is covered', () => {
		const ids = fixtures.map((fixture) => fixture.id);
		for (const id of MANDATED_FIXTURES) {
			expect(ids).toContain(id);
		}
	});

	test('each file is named after its kind and describes itself', () => {
		expect(fixtures.length).toBeGreaterThan(0);
		for (const fixture of fixtures) {
			expect(['evaluation', 'save-body', 'storage']).toContain(fixture.kind);
			expect(fixture.id.startsWith(`${fixture.kind}-`)).toBe(true);
			expect(fixture.description.length).toBeGreaterThan(30);
			expect(fixture.notes.length).toBeGreaterThan(0);
			expect(Object.keys(fixture.input).length).toBeGreaterThan(0);
			expect(Object.keys(fixture.expected).length).toBeGreaterThan(0);
		}
	});

	test('every fixture speaks a supported protocol', () => {
		for (const fixture of fixtures) {
			expect(isProtocolVersionSupported(fixture.protocolVersion)).toBe(true);
		}
	});

	test('every snapshot is exactly the mobile shape with iab reserved', () => {
		const snapshots = allSnapshots();
		expect(snapshots.length).toBeGreaterThan(0);
		for (const snapshot of snapshots) {
			expect(Object.keys(snapshot).sort()).toEqual(SNAPSHOT_KEYS);
			expect(snapshot.iab).toBeNull();
			// Directives are records the kernel commits when a live privacy signal
			// fires, so the field is a list of them rather than a permanently empty
			// array. `native/CONTRACT.md` said "always [] on mobile" and its own
			// Corrections section retires that: the kernel is the authority.
			const directives = snapshot.optOutDirectives as Record<string, unknown>[];
			expect(Array.isArray(directives)).toBe(true);
			for (const directive of directives) {
				expect(typeof directive.source).toBe('string');
				expect(Array.isArray(directive.categories)).toBe(true);
				expect(typeof directive.recordedAt).toBe('number');
			}
			// Only an active signal may leave one standing, so the empty case stays
			// pinned rather than free: a directive without an active gpc is a kernel
			// that recorded something it should not have.
			const gpc = (snapshot.privacySignals as Record<string, unknown>)
				.gpc as Record<string, unknown>;
			expect(directives.length === 0 || gpc.active === true).toBe(true);
			expect(snapshot.error).toBeNull();
			expect(typeof snapshot.ready).toBe('boolean');
			expect(typeof snapshot.policyPending).toBe('boolean');
			expect(snapshot.model).not.toBe('iab');
		}
	});

	test('permissions are a complete boolean map that always permits necessary', () => {
		for (const snapshot of allSnapshots()) {
			const permissions = permissionsOf(snapshot);
			expect(Object.keys(permissions).sort()).toEqual(PERMISSION_KEYS);
			expect(permissions.necessary).toBe(true);
			expect(
				Object.values(permissions).every((value) => typeof value === 'boolean')
			).toBe(true);
		}
	});

	/**
	 * Fail-closed before a choice, which is the guarantee the old "pending or
	 * unhydrated" version of this test stood in for. Every fixture answers a served
	 * /init, so no committed snapshot is pending, and an empty loop would have
	 * passed forever. The gate that the fixtures do reach is an opt-in policy with
	 * no receipt: nothing optional may be permitted there.
	 */
	test('an opt-in snapshot with no receipt yet denies every optional category', () => {
		const gated = allSnapshots().filter(
			(snapshot) =>
				snapshot.model === 'opt-in' && snapshot.explicitChoice === null
		);
		expect(gated.length).toBeGreaterThan(0);
		for (const snapshot of gated) {
			const optional = Object.entries(permissionsOf(snapshot))
				.filter(([category]) => category !== 'necessary')
				.map(([, value]) => value);
			expect(optional.length).toBe(4);
			expect(optional.every((value) => value === false)).toBe(true);
		}
	});

	test('a readable storage envelope round-trips to the same string', () => {
		const readable = readFixtures()
			.filter((fixture) => fixture.kind === 'storage')
			.filter((fixture) => (fixture.expected.decode as { ok: boolean }).ok);
		expect(readable.length).toBeGreaterThan(0);
		for (const fixture of readable) {
			expect(fixture.expected.reEncoded).toBe(fixture.input.storedEnvelope);
		}
	});

	test('an unreadable storage envelope applies nothing and stays deny-all', () => {
		const unreadable = readFixtures()
			.filter((fixture) => fixture.kind === 'storage')
			.filter((fixture) => !(fixture.expected.decode as { ok: boolean }).ok);
		expect(unreadable.length).toBeGreaterThan(0);
		for (const fixture of unreadable) {
			expect(fixture.expected.reEncoded).toBeNull();
			const snapshot = fixture.expected.snapshot as Record<string, unknown>;
			// The guarantee is that nothing stored is applied, so every optional
			// category stays denied. `ready` and `policyPending` are deliberately not
			// asserted: the fixture answers a served /init, and the kernel applies
			// that policy whatever storage held, so a policy is in force here.
			const permissions = permissionsOf(snapshot);
			expect(permissions.necessary).toBe(true);
			expect(
				Object.entries(permissions)
					.filter(([category]) => category !== 'necessary')
					.every(([, value]) => value === false)
			).toBe(true);
		}
	});

	test('save-body fixtures pin both the queued payload and the wire body', () => {
		const saves = readFixtures().filter(
			(fixture) => fixture.kind === 'save-body'
		);
		expect(saves.length).toBeGreaterThan(0);
		for (const fixture of saves) {
			const request = fixture.expected.request as {
				body: Record<string, unknown>;
				method: string;
				path: string;
			};
			expect(request.method).toBe('POST');
			expect(request.path).toBe('/subjects');
			expect(request.body.type).toBe('cookie_banner');
			expect(request.body.domain).toBe(fixture.input.domain);
			expect(request.body.givenAt).toBe(fixture.input.actionAt);
			// IAB is out of scope, so the key must stay absent, not null.
			expect('tcString' in request.body).toBe(false);
			const payload = fixture.expected.savePayload as Record<string, unknown>;
			expect(payload.givenAt).toBe(fixture.input.actionAt);
			expect(payload.tcString).toBeNull();
			const before = fixture.expected.snapshotBefore as { revision: number };
			const after = fixture.expected.snapshotAfter as { revision: number };
			expect(after.revision).toBe(before.revision + 1);
		}
	});

	test('save bodies carry gpc inside the decision inputs they assert', () => {
		const saves = readFixtures().filter(
			(fixture) => fixture.kind === 'save-body'
		);
		expect(saves.length).toBeGreaterThan(0);
		for (const fixture of saves) {
			const payload = fixture.expected.savePayload as {
				decisionInputs?: Record<string, unknown>;
			};
			// The kernel's `rememberDecisionInputs` always writes `gpc`, and
			// `buildDecisionAssertion` replays it, so a payload without the key is a
			// save the backend cannot check for staleness.
			expect(payload.decisionInputs).toBeDefined();
			expect('gpc' in (payload.decisionInputs as object)).toBe(true);
		}
	});

	test('overrides and privacy signals carry exactly the corrected fields', () => {
		for (const snapshot of allSnapshots()) {
			expect(Object.keys(snapshot.overrides as object).sort()).toEqual(
				OVERRIDE_KEYS
			);
			const { gpc } = snapshot.privacySignals as NativePrivacySignals;
			expect(Object.keys(gpc).sort()).toEqual(GPC_SIGNAL_KEYS);
			expect(typeof gpc.detected).toBe('boolean');
			expect(typeof gpc.active).toBe('boolean');
			expect(gpc.override === null || typeof gpc.override === 'boolean').toBe(
				true
			);
			// `active` is the value the evaluator honors, so it has to agree with
			// the override-then-detection rule rather than be a third opinion.
			expect(gpc.active).toBe(gpc.override ?? gpc.detected);
		}
	});
});

/**
 * Dropping the `gpc` override is not cosmetic. `decisionInputsMatchOverrides` in
 * `@c15t/core` compares the override against the inputs remembered from the last
 * init, and a save whose inputs no longer match is rejected as stale, so a
 * native save body without the field cannot pass the backend's check.
 *
 * The kernel is the authority here, which is why this test drives the real
 * function rather than a reimplementation of it.
 */
describe('gpc override staleness', () => {
	/**
	 * Project a protocol override record into the kernel's override shape.
	 *
	 * The two spell "unset" differently and the difference is load bearing:
	 * `NativeOverrides` carries an explicit `null` so the native cores serialize
	 * every key, while `KernelOverrides` treats an absent property as unset and
	 * compares only defined ones. Handing the kernel a `null` would make it see a
	 * defined override that differs from the remembered value, so every save would
	 * look stale. This is the mapping a caller has to make.
	 */
	const asKernelOverrides = function asKernelOverrides(
		overrides: NativeOverrides
	) {
		return {
			country: overrides.country ?? undefined,
			gpc: overrides.gpc ?? undefined,
			language: overrides.language,
			region: overrides.region ?? undefined,
		};
	};

	/** Project a protocol override record into remembered decision inputs. */
	const rememberedFor = function rememberedFor(
		overrides: NativeOverrides
	): RememberedDecisionInputs {
		return {
			country: overrides.country,
			gpc: overrides.gpc ?? undefined,
			language: overrides.language,
			region: overrides.region,
		};
	};

	test('the protocol override record feeds the kernel comparison', () => {
		const decided = rememberedFor(defaultNativeOverrides('en'));
		expect(
			decisionInputsMatchOverrides(
				decided,
				asKernelOverrides(defaultNativeOverrides('en'))
			)
		).toBe(true);
	});

	test('flipping the gpc override makes a remembered decision stale', () => {
		const decided = rememberedFor(defaultNativeOverrides('en'));
		const flipped: NativeOverrides = {
			...defaultNativeOverrides('en'),
			gpc: true,
		};
		expect(
			decisionInputsMatchOverrides(decided, asKernelOverrides(flipped))
		).toBe(false);
	});

	test('a signal detected after the decision does not make it stale', () => {
		// Only a defined override is compared, so a device that starts reporting GPC
		// mid-session changes the evaluation without invalidating the write. This is
		// the distinction the old boolean pair could not express at all.
		const decided = rememberedFor(defaultNativeOverrides('en'));
		const detected: NativePrivacySignals = {
			gpc: { active: true, detected: true, override: null },
		};
		expect(
			decisionInputsMatchOverrides(
				decided,
				asKernelOverrides({
					...defaultNativeOverrides('en'),
					gpc: detected.gpc.override,
				})
			)
		).toBe(true);
	});

	test('an override cleared back to unset leaves the decision standing', () => {
		const pinned: NativeOverrides = {
			...defaultNativeOverrides('en'),
			gpc: true,
		};
		const decided = rememberedFor(pinned);
		expect(
			decisionInputsMatchOverrides(
				decided,
				asKernelOverrides(defaultNativeOverrides('en'))
			)
		).toBe(true);
	});

	test('country and region still fold into the same comparison', () => {
		const decided = rememberedFor({
			...defaultNativeOverrides('en'),
			country: 'US',
			region: 'CA',
		});
		expect(
			decisionInputsMatchOverrides(
				decided,
				asKernelOverrides({
					...defaultNativeOverrides('en'),
					country: 'US',
					gpc: false,
					region: 'CA',
				})
			)
		).toBe(false);
	});
});
