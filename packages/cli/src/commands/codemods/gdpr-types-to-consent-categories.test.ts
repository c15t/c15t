import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runGdprTypesToConsentCategoriesCodemod } from './gdpr-types-to-consent-categories';

const createdDirs: string[] = [];

const createTempProject = async function createTempProject(
	content: string
): Promise<{ rootDir: string; filePath: string }> {
	const rootDir = await mkdtemp(join(tmpdir(), 'c15t-codemod-'));
	const filePath = join(rootDir, 'app.tsx');
	await writeFile(filePath, content, 'utf-8');
	createdDirs.push(rootDir);
	return { filePath, rootDir };
};

describe('gdpr-types-to-consent-categories codemod', () => {
	afterEach(async () => {
		await Array.from(createdDirs.splice(0, createdDirs.length)).reduce(
			async (previousIteration, dir) => {
				await previousIteration;
				await rm(dir, { force: true, recursive: true });
			},
			Promise.resolve()
		);
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
			dryRun: false,
			projectRoot: rootDir,
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
			dryRun: false,
			projectRoot: rootDir,
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
			dryRun: true,
			projectRoot: rootDir,
		});
		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(unchanged).toContain('gdprTypes');
		expect(unchanged).not.toContain('consentCategories');
	});
});
