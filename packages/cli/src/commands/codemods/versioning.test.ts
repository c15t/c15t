import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
		await Array.from(createdDirs.splice(0, createdDirs.length)).reduce(
			async (previousIteration, dir) => {
				await previousIteration;
				await rm(dir, { force: true, recursive: true });
			},
			Promise.resolve()
		);
	});

	it('matches simple comparator sets including prerelease semantics', () => {
		expect(satisfiesSimpleRange('1.9.0', '<2.0.0')).toBe(true);
		expect(satisfiesSimpleRange('2.0.0', '<2.0.0')).toBe(false);
		expect(satisfiesSimpleRange('2.0.0-rc.4', '<2.0.0')).toBe(true);
		expect(satisfiesSimpleRange('2.0.0-rc.4', '>=2.0.0')).toBe(false);
		expect(satisfiesSimpleRange('1.8.2', '>=1.0.0 <2.0.0')).toBe(true);
		expect(satisfiesSimpleRange('workspace:*', '>=2.0.0')).toBe(false);
	});

	it('detects most conservative c15t version from package.json deps', () => {
		const version = detectInstalledC15tVersionFromPackageJson({
			dependencies: {
				'@c15t/react': '~1.8.1',
				c15t: '^1.9.0',
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

	it('ignores independently versioned integrations and CLI dependencies', () => {
		expect(
			detectInstalledC15tVersionFromPackageJson({
				dependencies: {
					'@c15t/cli': '^1.5.0',
					'@c15t/integrations': '^1.0.0',
					c15t: '^3.0.0',
				},
			})
		).toBe('3.0.0');
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
			dependencies: {
				'@c15t/react': '^1.6.0',
			},
			name: 'test-project',
		};

		await writeFile(
			join(rootDir, 'package.json'),
			JSON.stringify(manifest, null, 2),
			'utf-8'
		);

		const detected = await detectInstalledC15tVersion(rootDir);
		expect(detected).toBe('1.6.0');
	});

	it.each(['catalog:', 'catalog:v2', 'link:../c15t-2.0.0', 'latest'])(
		'reads the installed c15t version for %s',
		async (specifier) => {
			const rootDir = await mkdtemp(join(tmpdir(), 'c15t-versioning-'));
			createdDirs.push(rootDir);
			await mkdir(join(rootDir, 'node_modules/@c15t/react'), {
				recursive: true,
			});
			await writeFile(
				join(rootDir, 'node_modules/@c15t/react/package.json'),
				JSON.stringify({ version: '1.8.0' }),
				'utf-8'
			);
			await writeFile(
				join(rootDir, 'package.json'),
				JSON.stringify({ dependencies: { '@c15t/react': specifier } }),
				'utf-8'
			);

			expect(await detectInstalledC15tVersion(rootDir)).toBe('1.8.0');
		}
	);

	it('reads a c15t version a workspace hoists to its root', async () => {
		const rootDir = await mkdtemp(join(tmpdir(), 'c15t-versioning-'));
		createdDirs.push(rootDir);
		const app = join(rootDir, 'packages/app');
		await mkdir(join(rootDir, 'node_modules/@c15t/react'), {
			recursive: true,
		});
		await mkdir(app, { recursive: true });
		await writeFile(
			join(rootDir, 'node_modules/@c15t/react/package.json'),
			JSON.stringify({ version: '2.3.0' }),
			'utf-8'
		);
		await writeFile(
			join(app, 'package.json'),
			JSON.stringify({ dependencies: { '@c15t/react': 'catalog:' } }),
			'utf-8'
		);

		expect(await detectInstalledC15tVersion(app)).toBe('2.3.0');
	});

	it('ignores the digits in a specifier that names no version', () => {
		expect(
			detectInstalledC15tVersionFromPackageJson({
				dependencies: { '@c15t/react': 'link:../c15t-2.0.0' },
			})
		).toBeNull();
	});
});
