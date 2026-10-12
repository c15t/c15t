/**
 * Two halves, and the first one is the reason the module exists.
 *
 * Every snapshot the generated fixtures claim has to match the key names the
 * TypeScript kernel declares, because Swift and Kotlin read those fixtures as truth.
 * The second half proves the checker actually names a rename: a validator that
 * returns nothing for a broken payload is how four keys drifted onto a device while
 * twenty-one fixtures stayed green.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
	describeSnapshotWireDrift,
	KERNEL_OWNED_KEYS,
	SNAPSHOT_KEYS,
} from '../wire-shape';

const FIXTURE_DIR = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../../../../native/protocol'
);

interface IndexEntry {
	file: string;
	id: string;
}

interface FixtureFile {
	expected: Record<string, unknown>;
	id: string;
}

const readIndex = function readIndex(): IndexEntry[] {
	const index = JSON.parse(
		readFileSync(resolve(FIXTURE_DIR, 'index.json'), 'utf8')
	) as { fixtures: IndexEntry[] };

	return index.fixtures;
};

/**
 * Every snapshot every fixture claims, with the case that claimed it, so a failure
 * names the file a core author has to look at.
 *
 * `revision-trace` is skipped for the same reason the native runners skip it: it
 * asserts a revision trace, and its starting snapshot is not something the contract
 * compares across implementations.
 */
const collectSnapshots = function collectSnapshots(): {
	fixture: string;
	snapshot: unknown;
	when: string;
}[] {
	const collected: { fixture: string; snapshot: unknown; when: string }[] = [];

	for (const entry of readIndex()) {
		const fixture = JSON.parse(
			readFileSync(resolve(FIXTURE_DIR, entry.file), 'utf8')
		) as FixtureFile;

		for (const when of ['snapshot', 'snapshotAfter', 'snapshotBefore']) {
			const snapshot = fixture.expected[when];

			if (snapshot !== null && typeof snapshot === 'object') {
				collected.push({ fixture: fixture.id, snapshot, when });
			}
		}
	}

	return collected;
};

/**
 * A fixture snapshot with one object replaced, which is how a bridge that renames a
 * key arrives.
 */
const withField = function withField(
	snapshot: Record<string, unknown>,
	path: string,
	value: unknown
): Record<string, unknown> {
	return { ...snapshot, [path]: value };
};

describe('every generated fixture snapshot matches the declared wire shape', () => {
	const snapshots = collectSnapshots();

	test('the fixtures carry snapshots worth checking', () => {
		// A path typo in FIXTURE_DIR would leave this suite asserting nothing at all.
		expect(snapshots.length).toBeGreaterThanOrEqual(20);
	});

	test.each(snapshots.map((entry) => [entry.fixture, entry] as const))(
		'%s',
		(_id, entry) => {
			expect(describeSnapshotWireDrift(entry.snapshot)).toEqual([]);
		}
	);

	test('the declared key list is the one the fixtures use', () => {
		const [first] = snapshots;
		expect(first).toBeDefined();

		expect(
			Object.keys((first?.snapshot ?? {}) as Record<string, unknown>).sort()
		).toEqual([...SNAPSHOT_KEYS].sort());
	});
});

describe('a renamed kernel-owned key is reported', () => {
	/**
	 * The four renames a real Android bridge shipped with: every one of them a name
	 * the core chose because it read better in Kotlin. All twenty-one fixtures passed
	 * while this was on a device, because the runner carried an accepted-differences
	 * entry for each.
	 */
	const renamed = function renamed(
		base: Record<string, unknown>
	): Record<string, unknown> {
		let candidate = base;

		candidate = withField(candidate, 'subject', { id: 'sub_9' });
		candidate = withField(candidate, 'location', {
			country: 'DE',
			region: 'BE',
		});
		candidate = withField(candidate, 'promptRequirement', {
			acknowledge: false,
			notice: true,
			purpose: 'banner',
		});
		candidate = withField(candidate, 'explicitChoice', {
			action: 'accept_all',
			actionAt: 1770000000000,
			consents: {},
			fingerprint: 'fp',
		});

		return candidate;
	};

	const [sample] = collectSnapshots();
	const base = (sample?.snapshot ?? {}) as Record<string, unknown>;
	const problems = describeSnapshotWireDrift(renamed(base));

	test('each rename names the key the kernel uses', () => {
		const joined = problems.join('\n');

		expect(joined).toContain('subject.subjectId: required here, absent');
		expect(joined).toContain('subject.id: the kernel owns these key names');
		expect(joined).toContain('location.countryCode: required here, absent');
		expect(joined).toContain(
			'location.country: the kernel owns these key names'
		);
		expect(joined).toContain('promptRequirement.kind: required here, absent');
		expect(joined).toContain(
			'promptRequirement.notice: the kernel owns these key names'
		);
		expect(joined).toContain(
			'explicitChoice.categories: required here, absent'
		);
		expect(joined).toContain(
			'explicitChoice.action: the kernel owns these key names'
		);
	});

	test('the owned objects are the whole of it, and nothing else moves', () => {
		// Every line belongs to a kernel-owned object: the rename must not be able to
		// hide behind noise from the rest of the payload.
		expect(problems.length).toBeGreaterThan(0);

		for (const problem of problems) {
			const [path] = problem.split('.');
			const owned = KERNEL_OWNED_KEYS.map((entry) => entry.path);
			expect(owned).toContain(path);
		}
	});
});

describe('describeSnapshotWireDrift on a hand-written payload', () => {
	/**
	 * A payload with every snapshot key present and the four kernel-owned objects spelled
	 * the way the kernel spells them, so each case below is one deliberate departure.
	 */
	const minimal = function minimal(): Record<string, unknown> {
		const owned: Record<string, unknown> = {
			explicitChoice: { categories: {}, version: 1 },
			location: { countryCode: 'DE', regionCode: 'BE' },
			promptRequirement: { kind: 'banner' },
			subject: { subjectId: 'sub_9' },
		};

		return Object.fromEntries(
			SNAPSHOT_KEYS.map((key) => {
				if (key in owned) {
					return [key, owned[key]];
				}

				return [key, key === 'iab' || key === 'error' ? null : {}];
			})
		);
	};

	test('a payload that is not an object says so once', () => {
		expect(describeSnapshotWireDrift(null)).toEqual([
			'the snapshot payload is not a JSON object',
		]);
		expect(describeSnapshotWireDrift('{"revision":1}')).toEqual([
			'the snapshot payload is not a JSON object',
		]);
		expect(describeSnapshotWireDrift([])).toEqual([
			'the snapshot payload is not a JSON object',
		]);
	});

	test('a missing snapshot key is named', () => {
		const candidate = minimal();
		delete candidate.revision;

		expect(describeSnapshotWireDrift(candidate)).toEqual([
			'revision: required by the snapshot type, absent from the payload',
		]);
	});

	test('an extra snapshot key is named', () => {
		expect(
			describeSnapshotWireDrift({ ...minimal(), tenantId: 'ten_1' })
		).toEqual(['tenantId: not a key the snapshot type declares']);
	});

	test('a kernel-owned object that is not an object is named once', () => {
		expect(
			describeSnapshotWireDrift(withField(minimal(), 'subject', 'sub_9'))
		).toEqual(['subject: expected an object the kernel owns, found string']);
	});

	test('a kernel-owned object that is absent is not drift', () => {
		// `subject` and `location` are null until geo resolves, which is a state the
		// type allows rather than a mistake by the core.
		const candidate = withField(
			withField(minimal(), 'subject', null),
			'explicitChoice',
			null
		);
		candidate.location = undefined;

		expect(describeSnapshotWireDrift(candidate)).toEqual([]);
	});

	test('optional kernel-owned keys are allowed', () => {
		const candidate = withField(minimal(), 'subject', {
			externalId: 'user@example.com',
			identityProvider: 'credential',
			subjectId: 'sub_9',
		});

		expect(describeSnapshotWireDrift(candidate)).toEqual([]);
	});

	test('the vendor list a device serves is read at the iab key', () => {
		// The slot is a body on one platform and the contract's `null` on the other, so
		// both are clean, and the walker stops at the top of the document itself.
		expect(
			describeSnapshotWireDrift(withField(minimal(), 'iab', null))
		).toEqual([]);
		expect(
			describeSnapshotWireDrift(withField(minimal(), 'iab', { gvl: null }))
		).toEqual([]);
		expect(
			describeSnapshotWireDrift(
				withField(minimal(), 'iab', {
					gvl: { tcfPolicyVersion: 5, vendorListVersion: 177 },
				})
			)
		).toEqual([]);
		// A slot that is neither null nor an object is named once, not per key.
		expect(
			describeSnapshotWireDrift(withField(minimal(), 'iab', 'iab'))
		).toEqual(['iab: expected an object the kernel owns, found string']);

		const owned = KERNEL_OWNED_KEYS.map((entry) => entry.path);
		expect(owned).toContain('iab');
	});

	test('an iab slot with no gvl is drift, and an invented IAB name is named', () => {
		// A slot with no `gvl` key says nothing about whether a list was served, and a
		// name the kernel does not use inside it is the rename this checker exists to
		// catch: invisible to Swift, to Kotlin, and to a type check.
		expect(describeSnapshotWireDrift(withField(minimal(), 'iab', {}))).toEqual([
			'iab.gvl: required here, absent from the payload',
		]);
		expect(
			describeSnapshotWireDrift(
				withField(minimal(), 'iab', { enabled: false, gvl: null })
			)
		).toEqual([
			'iab.enabled: the kernel owns these key names and does not use "enabled" here',
		]);

		// A core from a phase that grew the slot stays quiet while it keeps `gvl`, and is
		// named the moment the key a reader needs is the one that went missing.
		expect(
			describeSnapshotWireDrift(
				withField(minimal(), 'iab', { gvl: null, tcString: 'CQ...' }),
				{ allowUnknownKeys: true }
			)
		).toEqual([]);
		expect(
			describeSnapshotWireDrift(
				withField(minimal(), 'iab', { tcString: 'CQ...' }),
				{ allowUnknownKeys: true }
			)
		).toEqual([
			'iab.gvl: required here, absent from the payload',
			'iab.tcString: the kernel owns these key names and does not use "tcString" here',
		]);
	});

	test('allowUnknownKeys keeps a newer native build quiet but not a rename', () => {
		const added = describeSnapshotWireDrift(
			{ ...minimal(), tenantId: 'ten_1' },
			{ allowUnknownKeys: true }
		);
		expect(added).toEqual([]);

		// The missing key and the key that arrived instead, both named: half of that
		// tells a core author nothing they can act on.
		const renamedSubject = describeSnapshotWireDrift(
			withField(minimal(), 'subject', { id: 'sub_9' }),
			{ allowUnknownKeys: true }
		);
		expect(renamedSubject).toEqual([
			'subject.subjectId: required here, absent from the payload',
			'subject.id: the kernel owns these key names and does not use "id" here',
		]);
	});
});
