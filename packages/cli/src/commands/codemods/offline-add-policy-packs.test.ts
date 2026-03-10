import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runOfflineAddPolicyPacksCodemod } from './offline-add-policy-packs';

const createdDirs: string[] = [];

async function createTempProject(
	content: string
): Promise<{ rootDir: string; filePath: string }> {
	const rootDir = await mkdtemp(join(tmpdir(), 'c15t-codemod-'));
	const filePath = join(rootDir, 'app.tsx');
	await writeFile(filePath, content, 'utf-8');
	createdDirs.push(rootDir);
	return { rootDir, filePath };
}

describe('offline-add-policy-packs codemod', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('adds offlinePolicy.policyPacks to bare offline config', async () => {
		const source = `
const options = {
	mode: 'offline',
	consentCategories: ['necessary', 'marketing'],
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runOfflineAddPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('offlinePolicy');
		expect(updated).toContain('policyPackPresets.europeOptIn()');
		expect(updated).toContain('policyPackPresets.californiaOptOut()');
		expect(updated).toContain('policyPackPresets.worldNoBanner()');
		expect(updated).toContain('import { policyPackPresets }');
		expect(updated).toContain('c15t');
	});

	it('adds policyPacks to existing offlinePolicy without policyPacks', async () => {
		const source = `
const options = {
	mode: 'offline',
	offlinePolicy: {
		policyDecision: previewDecision,
	},
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runOfflineAddPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('policyPackPresets.europeOptIn()');
		expect(updated).toContain('policyDecision: previewDecision');
	});

	it('skips configs that already have offlinePolicy.policyPacks', async () => {
		const source = `
import { policyPackPresets } from 'c15t';

const options = {
	mode: 'offline',
	offlinePolicy: {
		policyPacks: [
			policyPackPresets.europeOptIn(),
			policyPackPresets.californiaOptOut(),
			policyPackPresets.worldNoBanner(),
		],
	},
};
`;
		const { rootDir } = await createTempProject(source);

		const result = await runOfflineAddPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(0);
	});

	it('skips non-offline mode configs', async () => {
		const source = `
const options = {
	mode: 'hosted',
	backendURL: '/api/c15t',
};
`;
		const { rootDir } = await createTempProject(source);

		const result = await runOfflineAddPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(0);
	});

	it('adds to existing c15t import instead of creating a new one', async () => {
		const source = `
import { ConsentManagerProvider } from '@c15t/react';

const options = {
	mode: 'offline',
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runOfflineAddPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('policyPackPresets');
		expect(updated).toContain('@c15t/react');
		// Should not create a separate c15t import
		expect(updated).not.toContain("from 'c15t'");
	});

	it('supports dry-run without modifying files', async () => {
		const source = `
const options = {
	mode: 'offline',
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runOfflineAddPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: true,
		});
		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(unchanged).not.toContain('offlinePolicy');
		expect(unchanged).not.toContain('policyPackPresets');
	});
});
