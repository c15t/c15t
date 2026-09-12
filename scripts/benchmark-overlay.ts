import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/** Use identical fixtures, including deletions, while retaining each revision's product. */
export const replaceBenchmarkFixtures = function replaceBenchmarkFixtures(
	source: string,
	base: string
) {
	const dependencyFields = [
		'dependencies',
		'devDependencies',
		'peerDependencies',
		'optionalDependencies',
	] as const;
	const tracked = (cwd: string, includeNew: boolean) =>
		execFileSync(
			'git',
			[
				'ls-files',
				'-z',
				'--cached',
				...(includeNew ? ['--others', '--exclude-standard'] : []),
				'--',
				'benchmarks',
			],
			{ cwd, encoding: 'utf8' }
		)
			.split('\0')
			.filter(Boolean);
	const manifests = new Map<string, string>();
	for (const file of tracked(source, true).filter((path) =>
		path.endsWith('/package.json')
	)) {
		if (!existsSync(join(source, file))) {
			continue;
		}
		if (!existsSync(join(base, file))) {
			throw new Error(
				`Benchmark fixture ${file} does not exist on the base revision.`
			);
		}
		const headManifest = JSON.parse(readFileSync(join(source, file), 'utf8'));
		const baseManifest = JSON.parse(readFileSync(join(base, file), 'utf8'));
		const baseDependencies = Object.assign(
			{},
			...dependencyFields.map((field) => baseManifest[field])
		);
		for (const field of dependencyFields) {
			for (const name of Object.keys(headManifest[field] ?? {})) {
				if (!(name in baseDependencies)) {
					throw new Error(
						`Benchmark fixture ${file} requires ${name}, which is absent from the base manifest. Use fixtures compatible with both revisions.`
					);
				}
			}
			headManifest[field] = baseManifest[field];
		}
		for (const field of [
			'overrides',
			'resolutions',
			'peerDependenciesMeta',
			'packageManager',
			'engines',
		]) {
			headManifest[field] = baseManifest[field];
		}
		manifests.set(file, `${JSON.stringify(headManifest, null, 2)}\n`);
	}
	for (const file of tracked(base, false)) {
		if (file.endsWith('/package.json')) {
			continue;
		}
		rmSync(join(base, file), { force: true });
	}
	for (const file of tracked(source, true)) {
		if (!existsSync(join(source, file))) {
			continue;
		}
		mkdirSync(dirname(join(base, file)), { recursive: true });
		const manifest = manifests.get(file);
		if (manifest === undefined) {
			cpSync(join(source, file), join(base, file));
		} else {
			writeFileSync(join(base, file), manifest);
		}
	}
};
