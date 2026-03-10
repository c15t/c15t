import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runOfflinePolicyPackToPolicyPacksCodemod } from './offline-policy-pack-to-policy-packs';

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

describe('offline-policy-pack-to-policy-packs codemod', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('moves top-level policyPacks into store.offlinePolicy.policies', async () => {
		const source = `
const options = {
	mode: 'offline',
	policyPacks: myPolicyPack,
	store: {
		offlinePolicy: {
			policyDecision: previewDecision,
		},
	},
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runOfflinePolicyPackToPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('policies: myPolicyPack');
		expect(updated).toContain('policyDecision: previewDecision');
		expect(updated).not.toContain('policyPacks: myPolicyPack');
	});

	it('creates offlinePolicy when store already exists', async () => {
		const source = `
const options = {
	mode: 'offline',
	policyPacks: myPolicyPack,
	store: {
		enabled: true,
	},
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runOfflinePolicyPackToPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('offlinePolicy: {');
		expect(updated).toContain('policies: myPolicyPack');
		expect(updated).toContain('enabled: true');
		expect(updated).not.toContain('policyPacks: myPolicyPack');
	});

	it('preserves existing nested policies and removes legacy aliases', async () => {
		const source = `
const options = {
	mode: 'offline',
	policyPacks: myPolicyPack,
	store: {
		offlinePolicy: {
			policies: nestedPolicies,
			policyPack: legacyPolicyPack,
		},
	},
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runOfflinePolicyPackToPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('policies: nestedPolicies');
		expect(updated).not.toContain('policyPack: legacyPolicyPack');
		expect(updated).not.toContain('policyPacks: myPolicyPack');
	});

	it('supports dry-run without modifying files', async () => {
		const source = `
const options = {
	policyPacks: myPolicyPack,
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runOfflinePolicyPackToPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: true,
		});
		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(unchanged).toContain('policyPacks: myPolicyPack');
		expect(unchanged).not.toContain('policies: myPolicyPack');
	});
});
