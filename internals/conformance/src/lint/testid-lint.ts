#!/usr/bin/env bun
/**
 * testid-lint — enforces the canonical DOM contract.
 *
 * Scans every framework package's component sources for `data-testid="…"`
 * literals and `data-testid={`…${…}…`}` template literals. Fails if a test-id
 * is not present in `contract/test-ids.ts` (or does not match a canonical
 * pattern).
 *
 * Skipped: `__tests__/`, `*.test.*`, `*.spec.*`, `*.stories.*`, `dist/`,
 * `node_modules/`. Test and story files are allowed to reference arbitrary
 * test-ids (fixtures, regression probes).
 *
 * Dynamic `data-testid={someIdentifier}` is not lintable statically and is
 * ignored; the caller is assumed to pass a canonical value.
 */

import { Glob } from 'bun';
import { isCanonicalTestId } from '../contract/test-ids';

export type TestIdViolation = {
	file: string;
	line: number;
	testId: string;
	kind: 'literal' | 'dynamic';
};

// Match data-testid as a JSX/Svelte attribute only. Leading `(?:^|\s)` excludes
// selector contexts like `[data-testid="foo"]` inside querySelector strings.
const LITERAL_RE = /(?:^|\s)data-testid=(?:"([^"]+)"|'([^']+)')/g;
const TEMPLATE_RE = /(?:^|\s)data-testid=\{`([^`]+)`\}/g;

const SKIP_FRAGMENTS = [
	'__tests__/',
	'.test.',
	'.spec.',
	'.stories.',
	'/dist/',
	'/node_modules/',
	'/.svelte-kit/',
];

export async function scanFileForViolations(
	absPath: string
): Promise<TestIdViolation[]> {
	const violations: TestIdViolation[] = [];
	const contents = await Bun.file(absPath).text();
	const lines = contents.split('\n');

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		for (const m of line.matchAll(LITERAL_RE)) {
			const id = m[1] ?? m[2];
			if (!id) continue;
			if (!isCanonicalTestId(id)) {
				violations.push({
					file: absPath,
					line: i + 1,
					testId: id,
					kind: 'literal',
				});
			}
		}
		for (const m of line.matchAll(TEMPLATE_RE)) {
			const template = m[1];
			if (!template) continue;
			// Substitute `${...}` with a lowercase sample so the pattern regexes can
			// match (each dynamic segment is required to be kebab-case by contract).
			const probed = template.replace(/\$\{[^}]+\}/g, 'sample');
			if (!isCanonicalTestId(probed)) {
				violations.push({
					file: absPath,
					line: i + 1,
					testId: template,
					kind: 'dynamic',
				});
			}
		}
	}

	return violations;
}

export async function runTestIdLint(
	roots: readonly string[]
): Promise<TestIdViolation[]> {
	const violations: TestIdViolation[] = [];
	for (const root of roots) {
		const glob = new Glob('**/*.{tsx,jsx,ts,svelte,vue}');
		for await (const match of glob.scan({ cwd: root, onlyFiles: true })) {
			const rel = `${root}/${match}`;
			if (SKIP_FRAGMENTS.some((frag) => rel.includes(frag))) continue;
			const fileViolations = await scanFileForViolations(rel);
			violations.push(...fileViolations);
		}
	}
	return violations;
}

async function main(): Promise<void> {
	const roots = [
		'packages/react',
		'packages/svelte',
		'packages/vue',
		'packages/solid',
		'packages/ui',
	];
	const violations = await runTestIdLint(roots);
	if (violations.length === 0) {
		// biome-ignore lint/suspicious/noConsole: CLI output
		console.log('✓ testid-lint: all test-ids are canonical');
		process.exit(0);
	}
	// biome-ignore lint/suspicious/noConsole: CLI output
	console.error(`✗ testid-lint: ${violations.length} non-canonical test-id(s)`);
	for (const v of violations) {
		// biome-ignore lint/suspicious/noConsole: CLI output
		console.error(`  ${v.file}:${v.line}  [${v.kind}]  ${v.testId}`);
	}
	// biome-ignore lint/suspicious/noConsole: CLI output
	console.error(
		'\nAdd the test-id to internals/conformance/src/contract/test-ids.ts (TEST_IDS or TEST_ID_PATTERNS)'
	);
	process.exit(1);
}

if (import.meta.main) {
	await main();
}
