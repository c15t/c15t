import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runComponentRenamesCodemod } from './component-renames';

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

describe('component-renames codemod', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('renames legacy component imports and JSX usage', async () => {
		const source = `
import {
	CookieBanner,
	ConsentManagerDialog,
	ConsentManagerWidget,
	type CookieBannerProps,
} from '@c15t/react';

const Demo = (props: CookieBannerProps) => (
	<>
		<CookieBanner />
		<ConsentManagerDialog />
		<ConsentManagerWidget />
	</>
);
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runComponentRenamesCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('ConsentBanner');
		expect(updated).toContain('ConsentDialog');
		expect(updated).toContain('ConsentWidget');
		expect(updated).toContain('ConsentBannerProps');
		expect(updated).not.toContain('CookieBanner');
		expect(updated).not.toContain('ConsentManagerDialog');
		expect(updated).not.toContain('ConsentManagerWidget');
	});

	it('does not rewrite files without c15t legacy imports', async () => {
		const source = `
import { CookieBanner } from './ui';

const value = CookieBanner;
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runComponentRenamesCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(0);
		expect(updated).toContain("import { CookieBanner } from './ui';");
	});

	it('supports dry-run without modifying files', async () => {
		const source = `
import { CookieBanner } from '@c15t/react';

export function Demo() {
	return <CookieBanner />;
}
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runComponentRenamesCodemod({
			projectRoot: rootDir,
			dryRun: true,
		});
		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(unchanged).toContain('CookieBanner');
		expect(unchanged).not.toContain('ConsentBanner');
	});
});
