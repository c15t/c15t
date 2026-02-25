import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	detectInstalledC15tVersion,
	detectInstalledC15tVersionFromPackageJson,
	isCodemodApplicableForVersion,
	satisfiesSimpleRange,
} from './versioning';

const createdDirs: string[] = [];

describe('codemod versioning', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('matches simple comparator sets including prerelease semantics', () => {
		expect(satisfiesSimpleRange('1.9.0', '<2.0.0')).toBe(true);
		expect(satisfiesSimpleRange('2.0.0', '<2.0.0')).toBe(false);
		expect(satisfiesSimpleRange('2.0.0-rc.4', '<2.0.0')).toBe(true);
		expect(satisfiesSimpleRange('2.0.0-rc.4', '>=2.0.0')).toBe(false);
		expect(satisfiesSimpleRange('1.8.2', '>=1.0.0 <2.0.0')).toBe(true);
	});

	it('detects most conservative c15t version from package.json deps', () => {
		const version = detectInstalledC15tVersionFromPackageJson({
			dependencies: {
				c15t: '^1.9.0',
				'@c15t/react': '~1.8.1',
			},
			devDependencies: {
				'@c15t/cli': '2.0.0-rc.4',
			},
		});

		expect(version).toBe('1.8.1');
	});

	it('returns null when no c15t packages are declared', () => {
		const version = detectInstalledC15tVersionFromPackageJson({
			dependencies: {
				react: '^19.0.0',
			},
		});

		expect(version).toBeNull();
	});

	it('filters codemods using from/to ranges', () => {
		const versioning = {
			fromRange: '<2.0.0',
			toRange: '>=2.0.0',
		};

		expect(isCodemodApplicableForVersion('1.9.9', versioning)).toBe(true);
		expect(isCodemodApplicableForVersion('2.0.0', versioning)).toBe(false);
		expect(isCodemodApplicableForVersion('2.0.0-rc.1', versioning)).toBe(true);
	});

	it('supports prerelease-to-prerelease codemod windows', () => {
		const rcWindow = {
			fromRange: '>=2.0.0-rc.2 <2.0.0-rc.4',
			toRange: '>=2.0.0-rc.4',
		};

		expect(isCodemodApplicableForVersion('2.0.0-rc.1', rcWindow)).toBe(false);
		expect(isCodemodApplicableForVersion('2.0.0-rc.2', rcWindow)).toBe(true);
		expect(isCodemodApplicableForVersion('2.0.0-rc.3', rcWindow)).toBe(true);
		expect(isCodemodApplicableForVersion('2.0.0-rc.4', rcWindow)).toBe(false);
	});

	it('detects installed c15t version from project package.json on disk', async () => {
		const rootDir = await mkdtemp(join(tmpdir(), 'c15t-versioning-'));
		createdDirs.push(rootDir);

		const manifest = {
			name: 'test-project',
			dependencies: {
				'@c15t/react': '^1.6.0',
			},
		};

		await writeFile(
			join(rootDir, 'package.json'),
			JSON.stringify(manifest, null, 2),
			'utf-8'
		);

		const detected = await detectInstalledC15tVersion(rootDir);
		expect(detected).toBe('1.6.0');
	});
});
