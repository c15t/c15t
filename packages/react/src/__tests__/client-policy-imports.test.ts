/**
 * The provider and components read policy resolutions; they never resolve a
 * pack.
 *
 * Resolving validates authored rules and hashes them with SHA-256. Every app
 * that renders the provider ships its module graph, so one value import of
 * the resolver puts that work, and about 20 KB of source, into every client
 * bundle. Offline mode resolves in the browser on purpose and server helpers
 * never reach a browser, so both are left out of the scan.
 */
import { describe, expect, test } from 'vitest';

// Raw source text, inlined by Vite so the scan works in browser-mode vitest.
const rawSources = import.meta.glob(
	[
		'../**/*.{ts,tsx}',
		'!../**/__tests__/**',
		'!../**/*.test.*',
		'!../**/*.spec.*',
		'!../server/**',
		'!../transports/offline.ts',
	],
	{ eager: true, import: 'default', query: '?raw' }
) as Record<string, string>;

/** Schema exports that resolve, validate or hash an authored pack. */
const RESOLVER_EXPORTS = [
	'createPolicyRuleFingerprints',
	'hashSha256Hex',
	'inspectPolicyRules',
	'matchPolicyRules',
	'normalizePolicyRule',
	'resolvePolicyRules',
	'validatePolicyRules',
];

const SCHEMA_VALUE_IMPORT =
	/^import\s+(?!type\b)\{(?<names>[^}]*)\}\s*from\s+'@c15t\/schema\/types';/gmu;

describe('client policy imports', () => {
	test('scans the provider', () => {
		expect(Object.keys(rawSources)).toContain('../provider.tsx');
	});

	test('no client module imports a pack resolver', () => {
		const offending = Object.entries(rawSources).flatMap(([file, text]) =>
			[...text.matchAll(SCHEMA_VALUE_IMPORT)].flatMap((match) =>
				(match.groups?.names ?? '')
					.split(',')
					.map((name) => name.trim().split(/\s+as\s+/u)[0] as string)
					.filter((name) => RESOLVER_EXPORTS.includes(name))
					.map((name) => `${file}: ${name}`)
			)
		);

		expect(offending).toEqual([]);
	});
});
