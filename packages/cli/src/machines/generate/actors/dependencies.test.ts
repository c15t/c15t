import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { checkInstalledDependencies } from './dependencies';

const tempDirs: string[] = [];

interface ProjectManifest {
	dependencies?: Record<string, string>;
}

const createProject = async function createProject(
	manifest: ProjectManifest
): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), 'c15t-check-deps-'));
	tempDirs.push(root);
	await writeFile(
		join(root, 'package.json'),
		JSON.stringify(manifest),
		'utf-8'
	);
	return root;
};

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true }))
	);
});

describe('checkInstalledDependencies', () => {
	it('reports the umbrella package as missing for a fresh app', async () => {
		const root = await createProject({
			dependencies: { react: '^19.0.0' },
		});

		const result = await checkInstalledDependencies({
			dependencies: ['c15t'],
			projectRoot: root,
		});

		expect(result.missing).toEqual(['c15t']);
		expect(result.installed).toEqual([]);
	});

	it('recognizes a direct umbrella install', async () => {
		const root = await createProject({
			dependencies: { c15t: '^3.0.0' },
		});

		const result = await checkInstalledDependencies({
			dependencies: ['c15t'],
			projectRoot: root,
		});

		expect(result.installed).toEqual(['c15t']);
		expect(result.missing).toEqual([]);
	});

	it('treats an existing @c15t/react install as satisfying the umbrella requirement', async () => {
		const root = await createProject({
			dependencies: { '@c15t/react': '^2.0.0', react: '^19.0.0' },
		});

		const result = await checkInstalledDependencies({
			dependencies: ['c15t', '@c15t/scripts'],
			projectRoot: root,
		});

		expect(result.installed).toEqual(['c15t']);
		expect(result.missing).toEqual(['@c15t/scripts']);
	});

	it('treats an existing @c15t/nextjs install as satisfying the umbrella requirement', async () => {
		const root = await createProject({
			dependencies: { '@c15t/nextjs': '^2.0.0', next: '^15.0.0' },
		});

		const result = await checkInstalledDependencies({
			dependencies: ['c15t'],
			projectRoot: root,
		});

		expect(result.installed).toEqual(['c15t']);
		expect(result.missing).toEqual([]);
	});

	it('does not let scoped installs satisfy other packages', async () => {
		const root = await createProject({
			dependencies: { '@c15t/react': '^2.0.0' },
		});

		const result = await checkInstalledDependencies({
			dependencies: ['@c15t/dev-tools'],
			projectRoot: root,
		});

		expect(result.missing).toEqual(['@c15t/dev-tools']);
	});
});
