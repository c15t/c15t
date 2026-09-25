/**
 * The client reader stays apart from pack resolution.
 *
 * Every browser that renders a consent surface reads a policy resolution off
 * the wire. None of them resolves a pack: that validates authored rules and
 * hashes them with SHA-256, which only servers and offline mode do. These
 * tests read the sources, not a bundle, so a failure names the import that
 * pulled resolution back into the reader's module graph.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { resolvePolicyRules } from './policy-resolution';
import { readPolicyResolutionWire } from './policy-resolution-wire';

const SHARED_DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(SHARED_DIR, '..');

/** Relative specifiers of `import`/`export ... from` statements that carry values. */
const valueImports = function valueImports(file: string): string[] {
	const text = readFileSync(file, 'utf8');
	const statements = text.match(
		/^(?:import|export)\s+(?!type\b)[^;]*?\sfrom\s+'(?<specifier>\.[^']+)';/gmu
	);
	return (statements ?? []).map(
		(statement) =>
			/'(?<specifier>\.[^']+)';$/u.exec(statement)?.groups?.specifier as string
	);
};

/** Files reachable from `entry` through static value imports. */
const staticGraph = function staticGraph(entry: string): Set<string> {
	const seen = new Set<string>();
	const pending = [entry];
	while (pending.length > 0) {
		const file = pending.pop() as string;
		if (seen.has(file)) {
			continue;
		}
		seen.add(file);
		for (const specifier of valueImports(file)) {
			pending.push(`${normalize(join(dirname(file), specifier))}.ts`);
		}
	}
	return new Set([...seen].map((file) => file.slice(SOURCE_DIR.length + 1)));
};

/** Source module each name in an `export { ... } from` block comes from. */
const exportSources = function exportSources(
	file: string
): Map<string, string> {
	const text = readFileSync(join(SOURCE_DIR, file), 'utf8');
	const sources = new Map<string, string>();
	for (const match of text.matchAll(
		/^export\s+\{(?<names>[^}]*)\}\s+from\s+'(?<source>[^']+)';/gmu
	)) {
		const names = match.groups?.names ?? '';
		for (const name of names.split(',')) {
			const trimmed = name.trim();
			if (trimmed && !trimmed.startsWith('type ')) {
				sources.set(trimmed, match.groups?.source as string);
			}
		}
	}
	return sources;
};

/** Everything the kernel and the hosted transport read from the policy contract. */
const CLIENT_EXPORTS = [
	'collectResolvedPolicyRuleIssues',
	'POLICY_CONTRACT_HEADER',
	'POLICY_CONTRACT_VERSION',
	'readPolicyResolutionWire',
	'safeFallbackPolicyInput',
	'writePolicyResolutionWire',
];

describe('client policy reader', () => {
	test('reaches only the resolved-rule invariants', () => {
		expect(staticGraph(join(SHARED_DIR, 'policy-resolution-wire.ts'))).toEqual(
			new Set([
				'shared/policy-resolution-wire.ts',
				'shared/policy-rule-invariants.ts',
			])
		);
	});

	test.each(['types.ts', 'shared/index.ts'])(
		'%s exports the client contract from its light modules',
		(barrel) => {
			const sources = exportSources(barrel);
			for (const name of CLIENT_EXPORTS) {
				expect(sources.get(name), name).toMatch(
					/\/policy-(?:resolution-wire|rule-invariants)$/u
				);
			}
		}
	);

	test('reads what resolution writes', () => {
		const resolution = resolvePolicyRules({
			countryCode: 'DE',
			regionCode: null,
			rules: [
				{
					categories: ['measurement', 'marketing'],
					id: 'eu',
					match: { countries: ['DE'] },
					model: 'opt-in',
					prompt: 'choice',
				},
			],
		});

		expect(
			readPolicyResolutionWire({ ...resolution, version: 1 })
		).toStrictEqual(resolution);
	});
});
