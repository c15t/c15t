/**
 * Replays every scenario in `native/ui` against the builders.
 *
 * The SwiftUI and Compose renderers will run the same files, so a builder that
 * drifts from them moves the contract for three platforms at once. Hashes are
 * checked first: a fixture edited by hand fails here before it can mislead a
 * port.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
	applyIabToggle,
	buildFirstLayer,
	buildIabFirstLayer,
	buildIabPurposeDetail,
	buildIabPurposes,
	buildIabVendorDetail,
	buildIabVendors,
	buildPreferences,
	seedConsentIabSelection,
} from '../index';

const UI_DIR = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../../../../native/ui'
);

interface IndexEntry {
	readonly bytes: number;
	readonly file: string;
	readonly sha256: string;
}

interface UiIndex {
	readonly count: number;
	readonly fixtures: readonly (IndexEntry & {
		readonly builder: string;
		readonly id: string;
	})[];
	readonly inputs: readonly (IndexEntry & { readonly name: string })[];
	readonly version: number;
}

interface UiFixture {
	readonly builder: string;
	readonly description: string;
	readonly expected: unknown;
	readonly id: string;
	readonly input: Record<string, unknown>;
	readonly version: number;
}

/* oxlint-disable typescript/no-explicit-any -- inputs are JSON by contract */
const BUILDERS: Record<string, (input: any) => unknown> = {
	applyIabToggle: (input) =>
		applyIabToggle(input.model, input.selection, input.rowId, input.value),
	buildFirstLayer,
	buildIabFirstLayer,
	buildIabPurposeDetail,
	buildIabPurposes,
	buildIabVendorDetail,
	buildIabVendors,
	buildPreferences,
	seedConsentIabSelection: (input) =>
		seedConsentIabSelection(input.model, input.initial),
};
/* oxlint-enable typescript/no-explicit-any */

const readBytes = (file: string): Buffer => readFileSync(resolve(UI_DIR, file));

const index = JSON.parse(readBytes('index.json').toString('utf8')) as UiIndex;

const inputs = new Map(
	index.inputs.map((entry) => [
		entry.name,
		JSON.parse(readBytes(entry.file).toString('utf8')) as unknown,
	])
);

/**
 * Swap each `{"$ref": name}` for the shared input it names.
 *
 * @param value - Fixture input, or a part of one.
 * @returns The input with every reference resolved.
 */
const resolveRefs = function resolveRefs(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(resolveRefs);
	}

	if (value !== null && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		const ref = record.$ref;

		if (typeof ref === 'string' && Object.keys(record).length === 1) {
			if (!inputs.has(ref)) {
				throw new Error(`Unknown input reference: ${ref}`);
			}

			return inputs.get(ref);
		}

		return Object.fromEntries(
			Object.entries(record).map(([key, child]) => [key, resolveRefs(child)])
		);
	}

	return value;
};

describe('native/ui manifest', () => {
	test('lists every fixture on disk and nothing else', () => {
		const onDisk = readdirSync(resolve(UI_DIR, 'fixtures'))
			.filter((name) => name.endsWith('.json'))
			.map((name) => `fixtures/${name}`)
			.sort();

		expect(index.version).toBe(1);
		expect(index.count).toBe(index.fixtures.length);
		expect(index.fixtures.map((entry) => entry.file).sort()).toEqual(onDisk);
	});

	test.each([...index.inputs, ...index.fixtures])(
		'$file matches its recorded size and hash',
		(entry) => {
			const bytes = readBytes(entry.file);

			expect(bytes.byteLength).toBe(entry.bytes);
			expect(createHash('sha256').update(bytes).digest('hex')).toBe(
				entry.sha256
			);
		}
	);
});

describe('native/ui fixtures', () => {
	test.each(index.fixtures)('$id', (entry) => {
		const fixture = JSON.parse(
			readBytes(entry.file).toString('utf8')
		) as UiFixture;
		const builder = BUILDERS[fixture.builder];

		expect(fixture.id).toBe(entry.id);
		expect(fixture.builder).toBe(entry.builder);
		expect(fixture.description.length).toBeGreaterThan(0);
		expect(builder, `no builder named ${fixture.builder}`).toBeDefined();

		const actual = builder?.(resolveRefs(fixture.input));

		// The fixtures went through JSON, so absent and undefined are the same.
		expect(JSON.parse(JSON.stringify(actual))).toEqual(fixture.expected);
	});
});
