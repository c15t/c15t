import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTestIdLint, scanFileForViolations } from './testid-lint';

function makeTempProject(files: Record<string, string>): string {
	const dir = mkdtempSync(join(tmpdir(), 'testid-lint-'));
	for (const [rel, content] of Object.entries(files)) {
		const abs = join(dir, rel);
		mkdirSync(join(abs, '..'), { recursive: true });
		writeFileSync(abs, content);
	}
	return dir;
}

test('accepts canonical literal test-ids', async () => {
	const dir = makeTempProject({
		'src/foo.tsx': `<div data-testid="consent-banner-root" />`,
	});
	try {
		const violations = await runTestIdLint([dir]);
		expect(violations).toEqual([]);
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test('rejects unknown literal test-ids', async () => {
	const dir = makeTempProject({
		'src/foo.tsx': `<div data-testid="not-a-real-id" />`,
	});
	try {
		const violations = await runTestIdLint([dir]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.testId).toBe('not-a-real-id');
		expect(violations[0]?.kind).toBe('literal');
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test('accepts template literals matching a pattern', async () => {
	const dir = makeTempProject({
		'src/foo.svelte':
			'<div data-testid={`consent-widget-switch-${name}`}></div>',
	});
	try {
		const violations = await runTestIdLint([dir]);
		expect(violations).toEqual([]);
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test('rejects template literals that no pattern matches', async () => {
	const dir = makeTempProject({
		'src/foo.svelte': '<div data-testid={`totally-fake-prefix-${name}`}></div>',
	});
	try {
		const violations = await runTestIdLint([dir]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.kind).toBe('dynamic');
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test('ignores data-testid inside querySelector strings', async () => {
	const dir = makeTempProject({
		'src/foo.tsx':
			'const el = container.querySelector(`[data-testid="${testId}"]`);',
	});
	try {
		const violations = await runTestIdLint([dir]);
		expect(violations).toEqual([]);
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test('skips test, spec, and story files', async () => {
	const dir = makeTempProject({
		'src/foo.test.tsx': `<div data-testid="not-canonical" />`,
		'src/foo.stories.tsx': `<div data-testid="also-not-canonical" />`,
		'src/__tests__/bar.tsx': `<div data-testid="third-non-canonical" />`,
	});
	try {
		const violations = await runTestIdLint([dir]);
		expect(violations).toEqual([]);
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test('reports accurate line numbers', async () => {
	const dir = makeTempProject({
		'src/multi.tsx': [
			'<div>',
			'  <div data-testid="consent-banner-root" />',
			'  <div data-testid="made-up-id" />',
			'</div>',
		].join('\n'),
	});
	try {
		const violations = await runTestIdLint([dir]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.line).toBe(3);
		expect(violations[0]?.testId).toBe('made-up-id');
	} finally {
		rmSync(dir, { recursive: true });
	}
});

test('scanFileForViolations returns empty for a valid file', async () => {
	const dir = makeTempProject({
		'src/good.tsx':
			'<div data-testid="consent-widget-root"><span data-testid="consent-widget-branding" /></div>',
	});
	try {
		const v = await scanFileForViolations(join(dir, 'src/good.tsx'));
		expect(v).toEqual([]);
	} finally {
		rmSync(dir, { recursive: true });
	}
});
