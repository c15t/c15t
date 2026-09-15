import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import fg from 'fast-glob';

import { readWorkspaces } from './ci-plan';
import type { CiPlan } from './ci-plan';

/** Require every selected consumer's emitted entry points before handing off builds. */
export const validateBuildOutputs = function validateBuildOutputs(
	selected: string[],
	root = '.'
) {
	const workspaces = readWorkspaces(root);
	const targets = (value: unknown): string[] => {
		if (typeof value === 'string') {
			return /^(?:\.\/)?dist(?:-types)?\//u.test(value) ? [value] : [];
		}
		if (value && typeof value === 'object') {
			return Object.values(value).flatMap(targets);
		}
		return [];
	};
	for (const name of selected) {
		const workspace = workspaces.find((item) => item.name === name);
		if (!workspace) {
			throw new Error(`Unknown selected package ${name}`);
		}
		const cwd = join(root, workspace.directory);
		const manifest = JSON.parse(
			readFileSync(join(cwd, 'package.json'), 'utf8')
		);
		const required = [
			...targets([
				manifest.exports,
				manifest.main,
				manifest.module,
				manifest.types,
				manifest.bin,
			]),
		];
		const roots = new Set(
			required.map((target) => target.replace(/^\.\//u, '').split('/')[0])
		);
		for (const outputRoot of roots) {
			const group = required.filter((target) =>
				target.replace(/^\.\//u, '').startsWith(`${outputRoot}/`)
			);
			const concrete = group.filter((target) => !target.includes('*'));
			const wildcards = group.filter((target) => target.includes('*'));
			// Wildcard keys need not name a file for every possible subpath. Each
			// declared output tree must nevertheless contain a matching artifact.
			if (
				!concrete.length &&
				wildcards.length &&
				!fg.sync(wildcards, { cwd, onlyFiles: true }).length
			) {
				throw new Error(
					`Missing wildcard build outputs for ${name}: ${wildcards.join(', ')}`
				);
			}
			for (const pattern of new Set(concrete)) {
				if (!fg.sync(pattern, { cwd, onlyFiles: true }).length) {
					throw new Error(`Missing build output for ${name}: ${pattern}`);
				}
			}
		}
	}
};

if (import.meta.main) {
	const plan: CiPlan = JSON.parse(readFileSync('ci-plan.json', 'utf8'));
	if (!plan.build.length) {
		throw new Error('No selected package builds to hand off.');
	}
	validateBuildOutputs(plan.build);
	// Keep symlinks and modes intact. Do not ship node_modules between jobs.
	const paths = fg.sync(
		[
			'packages/*/dist',
			'packages/*/dist-types',
			'packages/*/src/version.ts',
			'packages/*/src/lib/version.ts',
			'.turbo/cache',
		],
		{ dot: true, onlyDirectories: false, onlyFiles: false }
	);
	execFileSync('tar', ['-cf', 'ci-build.tar', 'ci-plan.json', ...paths], {
		stdio: 'inherit',
	});
}
