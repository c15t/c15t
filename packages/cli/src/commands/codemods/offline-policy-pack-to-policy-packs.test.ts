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

	it('lifts nested offline policy packs to top-level policyPacks', async () => {
		const source = `
const options = {
	mode: 'offline',
	store: {
		offlinePolicy: {
			policies: myPolicyPack,
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
		expect(updated).toContain('policyPacks: myPolicyPack');
		expect(updated).not.toContain('policies: myPolicyPack');
		expect(updated).not.toContain('offlinePolicy: {');
		expect(updated).not.toContain('store: {');
	});

	it('preserves non-pack offlinePolicy fields', async () => {
		const source = `
const options = {
	mode: 'offline',
	store: {
		offlinePolicy: {
			policyPack: myPolicyPack,
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
		expect(updated).toContain('policyPacks: myPolicyPack');
		expect(updated).toContain('policyDecision: previewDecision');
		expect(updated).toContain('offlinePolicy: {');
		expect(updated).not.toContain('policyPack: myPolicyPack');
	});

	it('supports dry-run without modifying files', async () => {
		const source = `
const options = {
	store: {
		offlinePolicy: {
			policies: myPolicyPack,
		},
	},
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runOfflinePolicyPackToPolicyPacksCodemod({
			projectRoot: rootDir,
			dryRun: true,
		});
		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(unchanged).toContain('offlinePolicy: {');
		expect(unchanged).not.toContain('policyPacks: myPolicyPack');
	});
});
