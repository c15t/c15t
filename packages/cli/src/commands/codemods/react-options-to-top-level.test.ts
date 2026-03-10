import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runReactOptionsToTopLevelCodemod } from './react-options-to-top-level';

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

describe('react-options-to-top-level codemod', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('lifts legacy react options to top-level', async () => {
		const source = `
const options = {
	mode: 'hosted',
	react: {
		theme: myTheme,
		colorScheme: 'dark',
		disableAnimation: true,
	},
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runReactOptionsToTopLevelCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('theme: myTheme');
		expect(updated).toContain("colorScheme: 'dark'");
		expect(updated).toContain('disableAnimation: true');
		expect(updated).not.toContain('react: {');
	});

	it('preserves unknown nested react keys', async () => {
		const source = `
const options = {
	react: {
		theme: myTheme,
		customOnly: true,
	},
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runReactOptionsToTopLevelCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('theme: myTheme');
		expect(updated).toContain('react: {');
		expect(updated).toContain('customOnly: true');
		expect(updated).not.toContain('react: {\n\t\ttheme');
	});

	it('supports dry-run without modifying files', async () => {
		const source = `
const options = {
	react: {
		theme: myTheme,
	},
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runReactOptionsToTopLevelCodemod({
			projectRoot: rootDir,
			dryRun: true,
		});
		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(unchanged).toContain('react: {');
		expect(unchanged).not.toContain('theme: myTheme,\n\ttheme: myTheme');
	});
});
