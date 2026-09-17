/**
 * Guards the two things the native cores depend on: the version handshake,
 * and the shape of every snapshot the fixtures claim.
 *
 * The fixture assertions are the important half. A fixture that drops a key,
 * or fills `iab` with something other than `null`, would silently move the
 * contract for Swift and Kotlin, because both read these files as truth.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

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

const readFixtures = function readFixtures(): FixtureFile[] {
	return readdirSync(FIXTURE_DIR)
		.filter((name) => name.endsWith('.json'))
		.sort()
		.map(
			(name) =>
				JSON.parse(
					readFileSync(resolve(FIXTURE_DIR, name), 'utf8')
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
			language: 'de-DE',
			region: null,
			test: null,
		});
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
	const fixtures = readFixtures();
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
			expect(snapshot.optOutDirectives).toEqual([]);
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

	test('a pending or unhydrated snapshot denies every optional category', () => {
		const gated = allSnapshots().filter(
			(snapshot) => snapshot.policyPending === true || snapshot.ready === false
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
			expect(snapshot.ready).toBe(false);
			expect(snapshot.policyPending).toBe(true);
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
});
