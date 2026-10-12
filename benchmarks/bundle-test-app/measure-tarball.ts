import { spawnSync } from 'node:child_process';
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

/** Runs `npm pack --json` with extra arguments in `cwd`. */
export type PackRunner = (
	cwd: string,
	args: readonly string[]
) => {
	error?: Error;
	status: number | null;
	stderr: string;
	stdout: string;
};

const npmPack: PackRunner = (cwd, args) =>
	spawnSync('npm', ['pack', '--json', '--ignore-scripts', ...args], {
		cwd,
		encoding: 'utf8',
	});

/**
 * Whether a packed path is consumer documentation generated into the package
 * (`docs/`, `AGENTS.md`, `SKILL.md`). The artifact budget measures code only,
 * so these files are left out of the measured tarball.
 */
export const isBundledDocsPath = (path: string): boolean =>
	path === 'AGENTS.md' ||
	path === 'SKILL.md' ||
	path === 'docs' ||
	path.startsWith('docs/');

const readPackOutput = (
	packageDir: string,
	result: ReturnType<PackRunner>
): Record<string, unknown> => {
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
	return artifact;
};

const readPackedPaths = (
	packageDir: string,
	listing: Record<string, unknown>
): string[] => {
	const { files } = listing;
	if (
		!Array.isArray(files) ||
		files.length === 0 ||
		!files.every((file) => typeof file?.path === 'string')
	) {
		throw new Error(`Missing npm pack file list for ${packageDir}`);
	}
	return files.map((file: { path: string }) => file.path);
};

/**
 * Packs a consumer artifact without its bundled docs and returns the tarball
 * size. Both benchmark arms run this script, so base and head are measured
 * the same way.
 *
 * `npm pack --dry-run` lists the files the package publishes. Every file
 * except bundled docs is copied into a temporary directory and packed there,
 * so the size is a real npm tarball of the code.
 *
 * @throws {Error} When either pack fails or reports invalid output; a missing
 * measurement must never become zero bytes.
 */
export const runTarballSize = (
	packageDir: string,
	pack: PackRunner = npmPack
): { size: number; notes: string[]; includesDialogRules: boolean | null } => {
	const resolvedDir = resolve(packageDir);
	const paths = readPackedPaths(
		packageDir,
		readPackOutput(packageDir, pack(resolvedDir, ['--dry-run']))
	);
	const staging = mkdtempSync(join(tmpdir(), 'c15t-pack-'));
	try {
		let excluded = 0;
		for (const path of paths) {
			if (isBundledDocsPath(path)) {
				excluded += 1;
				continue;
			}
			mkdirSync(dirname(join(staging, path)), { recursive: true });
			copyFileSync(join(resolvedDir, path), join(staging, path));
		}
		const artifact = readPackOutput(packageDir, pack(staging, []));
		const tarball = join(staging, artifact.filename as string);
		if (
			typeof artifact.size !== 'number' ||
			!Number.isSafeInteger(artifact.size) ||
			artifact.size <= 0 ||
			!statSync(tarball, { throwIfNoEntry: false })?.isFile() ||
			statSync(tarball).size !== artifact.size
		) {
			throw new Error(`Invalid npm pack size for ${packageDir}`);
		}
		const notes =
			excluded > 0
				? [
						`${basename(resolvedDir)}: ${excluded} bundled docs files left out of the measured tarball.`,
					]
				: [];
		// Inspect the same flat stylesheet that was packed. A missing file is
		// unknown, not evidence that the baseline predates the dialog CSS fix.
		const flatStylesPath = 'dist/styles.tw3.css';
		const flatStyles = paths.includes(flatStylesPath)
			? readFileSync(join(staging, flatStylesPath), 'utf8').replace(
					/\/\*[\s\S]*?\*\//gu,
					''
				)
			: null;
		const includesDialogRules =
			flatStyles === null
				? null
				: /\.c15t-ui-dialogVisible-[\w-]+[^{}]*\{/u.test(flatStyles);
		return { includesDialogRules, notes, size: artifact.size };
	} finally {
		rmSync(staging, { force: true, recursive: true });
	}
};
