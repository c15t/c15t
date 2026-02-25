import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runC15tModeToHostedCodemod } from './mode-c15t-to-hosted';

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

describe('mode-c15t-to-hosted codemod', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it("transforms mode values from 'c15t' to 'hosted'", async () => {
		const source = `
const options = {
	mode: 'c15t',
	backendURL: '/api/c15t',
};`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runC15tModeToHostedCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});

		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(result.errors).toHaveLength(0);
		expect(updated).toContain("mode: 'hosted'");
		expect(updated).toContain("backendURL: '/api/c15t'");
	});

	it('supports dry-run without modifying files', async () => {
		const source = `
const options = {
	mode: 'c15t',
};`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runC15tModeToHostedCodemod({
			projectRoot: rootDir,
			dryRun: true,
		});

		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(result.errors).toHaveLength(0);
		expect(unchanged).toContain("mode: 'c15t'");
		expect(unchanged).not.toContain("mode: 'hosted'");
	});

	it('is idempotent when no legacy mode values remain', async () => {
		const source = `
const options = {
	mode: 'hosted',
};`;
		const { rootDir } = await createTempProject(source);

		const result = await runC15tModeToHostedCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});

	it("does not rewrite unrelated 'c15t' strings", async () => {
		const source = `
const label = 'c15t';
const options = {
	backendURL: '/api/c15t',
};`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runC15tModeToHostedCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
		expect(updated).toContain("const label = 'c15t'");
		expect(updated).toContain("backendURL: '/api/c15t'");
	});
});
