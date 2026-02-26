import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runIgnoreGeoLocationToOverridesCodemod } from './ignore-geo-location-to-overrides';

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

describe('ignore-geo-location-to-overrides codemod', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('converts ignoreGeoLocation true to overrides.country', async () => {
		const source = `
const options = {
	mode: 'hosted',
	ignoreGeoLocation: true,
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runIgnoreGeoLocationToOverridesCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain("overrides: { country: 'DE' }");
		expect(updated).not.toContain('ignoreGeoLocation');
	});

	it('merges ignoreGeoLocation into existing overrides object', async () => {
		const source = `
const options = {
	overrides: {
		language: 'de',
	},
	ignoreGeoLocation: shouldForce,
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runIgnoreGeoLocationToOverridesCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain("country: shouldForce ? 'DE' : undefined");
		expect(updated).toContain("language: 'de'");
		expect(updated).not.toContain('ignoreGeoLocation');
	});

	it('removes ignoreGeoLocation false without adding overrides', async () => {
		const source = `
const options = {
	ignoreGeoLocation: false,
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runIgnoreGeoLocationToOverridesCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).not.toContain('ignoreGeoLocation');
		expect(updated).not.toContain('overrides');
	});
});
