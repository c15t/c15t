import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkAgentsMd } from '../lib/agents/check-agents-md';
import { AGENT_PACKAGE_METADATA } from '../lib/agents/package-metadata';
import { renderManagedBlock } from '../lib/agents/render-managed-block';
import type { InstalledAgentPackage } from '../lib/agents/types';
import {
	extractManagedBlock,
	upsertAgentsMd,
} from '../lib/agents/upsert-agents-md';

const tempDirs: string[] = [];

function makeTempDir() {
	const dir = mkdtempSync(join(tmpdir(), 'c15t-agents-'));
	tempDirs.push(dir);
	return dir;
}

function makeInstalledPackage(
	packageName: keyof typeof AGENT_PACKAGE_METADATA
) {
	return {
		packageName,
		packageRoot: `/virtual/${packageName}`,
		docsDir: `/virtual/${packageName}/dist/docs`,
		metadata: AGENT_PACKAGE_METADATA[packageName],
	};
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe('agents helpers', () => {
	it('renders multi-package managed blocks in deterministic order', () => {
		const managed = renderManagedBlock([
			makeInstalledPackage('@c15t/nextjs'),
			makeInstalledPackage('@c15t/react'),
		]);

		expect(managed).toContain('BEGIN:c15t-agent-rules');
		expect(managed.indexOf('c15t React')).toBeLessThan(
			managed.indexOf('c15t Next.js')
		);
		expect(managed).toContain('If multiple c15t packages are installed');
		expect(managed).toContain('node_modules/@c15t/react/dist/docs/');
	});

	it('upserts only the managed block and preserves user content', () => {
		const projectDir = makeTempDir();
		const agentsPath = join(projectDir, 'AGENTS.md');
		writeFileSync(agentsPath, '# User notes\n\nKeep this.\n', 'utf8');

		const managed = renderManagedBlock([makeInstalledPackage('@c15t/react')]);

		upsertAgentsMd(agentsPath, managed);
		const firstPass = readFileSync(agentsPath, 'utf8');
		expect(firstPass).toContain('# User notes');
		expect(firstPass).toContain('BEGIN:c15t-agent-rules');

		const updated = managed.replace('script loading', 'script loading updated');

		upsertAgentsMd(agentsPath, updated);
		const secondPass = readFileSync(agentsPath, 'utf8');
		expect(secondPass).toContain('# User notes');
		expect(secondPass).toContain('script loading updated');
		expect(extractManagedBlock(secondPass)).toContain('script loading updated');
	});

	it('checks whether AGENTS.md is up to date', () => {
		const projectDir = makeTempDir();
		const agentsPath = join(projectDir, 'AGENTS.md');
		const managed = renderManagedBlock([makeInstalledPackage('@c15t/backend')]);

		upsertAgentsMd(agentsPath, managed);
		expect(checkAgentsMd(agentsPath, managed).ok).toBe(true);
		expect(
			checkAgentsMd(
				agentsPath,
				managed.replace('policy packs', 'policy packs updated')
			).ok
		).toBe(false);
	});
});
