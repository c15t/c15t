/// <reference types="node" />
/**
 * Client code reads policy resolutions; it never resolves a pack.
 *
 * Resolving validates authored rules and hashes them with SHA-256. The kernel,
 * the hosted transport and the runtime ship to every visitor, so a value
 * import of the resolver anywhere in their static graph puts that work, and
 * its bytes, into every client bundle. Offline mode resolves in the browser
 * on purpose and loads on demand, so it is not an entry here.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolvePolicyRules } from '@c15t/schema/types';
import { describe, expect, test } from 'vitest';

import { disabledPolicyResolution } from '../policy';

const SOURCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

const CLIENT_ENTRIES = [
	'kernel/index.ts',
	'policy.ts',
	'runtime/index.ts',
	'transports/hosted.ts',
	'transports/init-output.ts',
];

/** Schema exports that resolve, validate or hash an authored pack. */
const RESOLVER_EXPORTS = new Set([
	'createDeterministicFingerprint',
	'createDeterministicFingerprintSync',
	'createMaterialPolicyFingerprint',
	'createMaterialPolicyFingerprintSync',
	'createPolicyRuleFingerprints',
	'hashSha256Hex',
	'inspectPolicyRules',
	'matchPolicyRules',
	'normalizePolicyRule',
	'resolvePolicyRules',
	'validatePolicyRules',
]);

const STATIC_VALUE_IMPORT =
	/^(?:import|export)\s+(?!type\b)(?:\{(?<names>[^}]*)\}|[^;]*?)\s*from\s+'(?<specifier>[^']+)';/gmu;

const resolveRelative = function resolveRelative(
	from: string,
	specifier: string
): string {
	const base = normalize(join(dirname(from), specifier));
	for (const candidate of [`${base}.ts`, join(base, 'index.ts')]) {
		try {
			readFileSync(candidate);
			return candidate;
		} catch {
			// Try the next candidate.
		}
	}
	throw new Error(`Cannot resolve ${specifier} from ${from}`);
};

/** Names each file in the static graph imports from `@c15t/schema/types`. */
const schemaImports = function schemaImports(
	entries: string[]
): Map<string, string[]> {
	const found = new Map<string, string[]>();
	const seen = new Set<string>();
	const pending = entries.map((entry) => join(SOURCE_DIR, entry));
	while (pending.length > 0) {
		const file = pending.pop() as string;
		if (seen.has(file)) {
			continue;
		}
		seen.add(file);
		for (const match of readFileSync(file, 'utf8').matchAll(
			STATIC_VALUE_IMPORT
		)) {
			const specifier = match.groups?.specifier as string;
			if (specifier.startsWith('.')) {
				pending.push(resolveRelative(file, specifier));
			} else if (specifier === '@c15t/schema/types') {
				const names = (match.groups?.names ?? '')
					.split(',')
					.map((name) => name.trim().split(/\s+as\s+/u)[0] as string)
					.filter((name) => name && !name.startsWith('type '));
				found.set(file.slice(SOURCE_DIR.length + 1), names);
			}
		}
	}
	return found;
};

describe('client policy graph', () => {
	test('imports no pack resolver from the schema', () => {
		const offending = [...schemaImports(CLIENT_ENTRIES)].flatMap(
			([file, names]) =>
				names
					.filter((name) => RESOLVER_EXPORTS.has(name))
					.map((name) => `${file}: ${name}`)
		);

		expect(offending).toEqual([]);
	});

	test('the disabled resolution matches what the resolver produces', () => {
		expect(disabledPolicyResolution()).toStrictEqual(
			resolvePolicyRules({
				countryCode: null,
				regionCode: null,
				rules: [
					{
						id: 'disabled',
						match: { fallback: true },
						model: 'opt-out',
						prompt: 'none',
					},
				],
			})
		);
	});

	test('the disabled resolution is a fresh copy', () => {
		const first = disabledPolicyResolution();
		first.policy.scope.pop();

		expect(disabledPolicyResolution().policy.scope).toHaveLength(4);
	});
});
