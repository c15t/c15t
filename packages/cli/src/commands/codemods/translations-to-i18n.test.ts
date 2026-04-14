import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runTranslationsToI18nCodemod } from './translations-to-i18n';

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

describe('translations-to-i18n codemod', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('transforms legacy translations config into i18n config', async () => {
		const source = `
const options = {
	translations: {
		defaultLanguage: 'en',
		disableAutoLanguageSwitch: true,
		translations: {
			de: {
				cookieBanner: { title: 'Datenschutz' },
			},
		},
	},
};`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runTranslationsToI18nCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});

		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('i18n:');
		expect(updated).toContain('locale:');
		expect(updated).toContain('detectBrowserLanguage: false');
		expect(updated).toContain('messages:');
		expect(updated).not.toContain('defaultLanguage:');
		expect(updated).not.toContain('disableAutoLanguageSwitch:');
	});

	it('supports dry-run without modifying files', async () => {
		const source = `
const options = {
	translations: {
		defaultLanguage: 'en',
		translations: {
			en: {},
		},
	},
};`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runTranslationsToI18nCodemod({
			projectRoot: rootDir,
			dryRun: true,
		});

		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(unchanged).toContain('translations: {');
		expect(unchanged).not.toContain('i18n:');
	});

	it('is idempotent on already migrated code', async () => {
		const source = `
const options = {
	i18n: {
		locale: 'en',
		detectBrowserLanguage: true,
		messages: {
			en: {},
		},
	},
};`;
		const { rootDir } = await createTempProject(source);

		const result = await runTranslationsToI18nCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});

		expect(result.changedFiles).toHaveLength(0);
	});

	it('does not rewrite non-config translation payload objects', async () => {
		const source = `
const payload = {
	translations: {
		// Intentional non-legacy payload: sibling "language" + "translations"
		// makes isLegacyTranslationConfigObject return false.
		language: 'de',
		translations: {
			cookieBanner: { title: 'Titel' },
		},
	},
};`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runTranslationsToI18nCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(0);
		expect(updated).toContain("language: 'de'");
		expect(updated).toContain('translations: {');
		expect(updated).not.toContain('i18n:');
	});

	it('does not modify legacy translations when i18n already exists', async () => {
		const source = `
const options = {
	i18n: {
		locale: 'fr',
		messages: {
			fr: {},
		},
	},
	translations: {
		defaultLanguage: 'en',
		disableAutoLanguageSwitch: true,
		translations: {
			en: {},
		},
	},
};`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runTranslationsToI18nCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(0);
		expect(updated).toContain('i18n: {');
		expect(updated).toContain('translations: {');
		expect(updated).toContain('defaultLanguage:');
	});
});
