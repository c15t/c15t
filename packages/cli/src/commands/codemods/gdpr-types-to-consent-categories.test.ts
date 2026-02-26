import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runGdprTypesToConsentCategoriesCodemod } from './gdpr-types-to-consent-categories';

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

describe('gdpr-types-to-consent-categories codemod', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('renames legacy consent category keys and accessors', async () => {
		const source = `
const options = {
	gdprTypes: ['necessary'],
	store: {
		initialGDPRTypes: ['necessary', 'marketing'],
	},
};

const payload = { gdprTypes };
const { gdprTypes, initialGDPRTypes } = options;
const copy = settings.gdprTypes;
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runGdprTypesToConsentCategoriesCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain("consentCategories: ['necessary']");
		expect(updated).toContain("consentCategories: ['necessary', 'marketing']");
		expect(updated).toContain(
			'const payload = { consentCategories: gdprTypes };'
		);
		expect(updated).toContain(
			'const { consentCategories: gdprTypes, consentCategories: initialGDPRTypes } = options;'
		);
		expect(updated).toContain('const copy = settings.consentCategories;');
		expect(updated).not.toContain('initialGDPRTypes:');
	});

	it('skips rename when consentCategories already exists in same object', async () => {
		const source = `
const options = {
	consentCategories: ['necessary'],
	gdprTypes: ['marketing'],
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runGdprTypesToConsentCategoriesCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(0);
		expect(updated).toContain("gdprTypes: ['marketing']");
	});

	it('supports dry-run without modifying files', async () => {
		const source = `
const options = {
	gdprTypes: ['necessary'],
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runGdprTypesToConsentCategoriesCodemod({
			projectRoot: rootDir,
			dryRun: true,
		});
		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(unchanged).toContain('gdprTypes');
		expect(unchanged).not.toContain('consentCategories');
	});
});
