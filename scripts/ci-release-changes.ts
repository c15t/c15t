import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { parse } from 'jsonc-parser';
import type { ParseError } from 'jsonc-parser';

import type { Workspace } from './ci-plan';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const stableValue = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(stableValue);
	}
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.keys(value)
				.sort()
				.map((key) => [key, stableValue(value[key])])
		);
	}
	return value;
};

const readJson = (content: string): unknown => {
	const errors: ParseError[] = [];
	const value: unknown = parse(content, errors, { allowTrailingComma: true });
	if (errors.length) {
		throw new Error('Invalid release metadata.');
	}
	return value;
};

const withoutVersion = (value: Record<string, unknown>) =>
	Object.fromEntries(
		Object.entries(value).filter(([key]) => key !== 'version')
	);

/** Ignore workspace version bumps, while preserving every dependency resolution. */
export const lockDependenciesUnchanged = function lockDependenciesUnchanged(
	before: string,
	after: string
): boolean {
	const normalize = (content: string) => {
		const lock = readJson(content);
		if (!isRecord(lock) || !isRecord(lock.workspaces)) {
			throw new Error('Missing lockfile workspaces.');
		}
		return stableValue({
			...lock,
			workspaces: Object.fromEntries(
				Object.entries(lock.workspaces).map(([path, workspace]) => [
					path,
					isRecord(workspace) ? withoutVersion(workspace) : workspace,
				])
			),
		});
	};
	return JSON.stringify(normalize(before)) === JSON.stringify(normalize(after));
};

/** Separate release packaging from runtime validation, only on release pushes. */
export const selectReleaseChanges = function selectReleaseChanges(
	files: string[],
	base: string,
	workspaces: Workspace[],
	readBefore = (path: string) =>
		execFileSync('git', ['show', `${base}:${path}`], {
			encoding: 'utf8',
			// The monorepo lockfile exceeds execFileSync's default 1 MiB buffer.
			maxBuffer: 64 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'pipe'],
		}),
	readAfter = (path: string) => readFileSync(path, 'utf8')
) {
	const versionedPackages: string[] = [];
	const runtimeFiles = files.filter((path) => {
		// The publisher validates the lock's branch, versions and channel before uploads.
		if (path === '.tegami/publish-lock.yaml') {
			return false;
		}
		try {
			if (path === 'bun.lock') {
				return !lockDependenciesUnchanged(readBefore(path), readAfter(path));
			}
			const workspace = workspaces.find(
				(item) => path === `${item.directory}/package.json`
			);
			if (workspace) {
				const before = readJson(readBefore(path));
				const after = readJson(readAfter(path));
				if (
					isRecord(before) &&
					isRecord(after) &&
					typeof before.version === 'string' &&
					typeof after.version === 'string' &&
					JSON.stringify(stableValue(withoutVersion(before))) ===
						JSON.stringify(stableValue(withoutVersion(after)))
				) {
					versionedPackages.push(workspace.name);
					return false;
				}
			}
		} catch {
			// Missing, deleted or malformed files keep the normal conservative selection.
		}
		return true;
	});
	return { files: runtimeFiles, versionedPackages };
};
