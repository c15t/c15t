import { spawnSync } from 'node:child_process';
import { statSync, unlinkSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

/** Pack a consumer artifact; missing measurements must never become zero bytes. */
export const runTarballSize = (
	packageDir: string,
	pack = (cwd: string) =>
		spawnSync('npm', ['pack', '--json', '--ignore-scripts'], {
			cwd,
			encoding: 'utf8',
		})
): { size: number; notes: string[] } => {
	const resolvedDir = resolve(packageDir);
	const result = pack(resolvedDir);
	if (result.error || result.status !== 0) {
		throw new Error(
			`npm pack failed for ${packageDir}: ${result.error?.message ?? result.stderr}`,
			{ cause: result.error }
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(result.stdout);
	} catch (error) {
		throw new Error(`Invalid npm pack JSON for ${packageDir}`, {
			cause: error,
		});
	}
	const artifact =
		Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : undefined;
	if (
		!artifact ||
		typeof artifact.filename !== 'string' ||
		basename(artifact.filename) !== artifact.filename ||
		!artifact.filename.endsWith('.tgz')
	) {
		throw new Error(`Missing npm pack artifact for ${packageDir}`);
	}
	const path = join(resolvedDir, artifact.filename);
	try {
		if (
			typeof artifact.size !== 'number' ||
			!Number.isSafeInteger(artifact.size) ||
			artifact.size <= 0 ||
			!statSync(path).isFile() ||
			statSync(path).size !== artifact.size
		) {
			throw new Error(`Invalid npm pack size for ${packageDir}`);
		}
		return { notes: [], size: artifact.size };
	} finally {
		unlinkSync(path);
	}
};
