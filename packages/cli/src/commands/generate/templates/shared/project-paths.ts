import fs from 'node:fs/promises';
import path from 'node:path';

import { CliError } from '../../../../core/errors';

const inside = (root: string, target: string): boolean => {
	const relative = path.relative(root, target);
	return (
		relative !== '..' &&
		!relative.startsWith(`..${path.sep}`) &&
		!path.isAbsolute(relative)
	);
};

/** Resolve internal links while rejecting targets outside the real project root. */
const resolveProjectPath = async (
	root: string,
	realRoot: string,
	filePath: string
): Promise<string> => {
	const absolute = path.resolve(filePath);
	const base = inside(root, absolute) ? root : realRoot;
	if (!inside(base, absolute) || absolute === base) {
		throw new CliError('CONFIG_INVALID', {
			details: `Generation target is outside the project: ${filePath}`,
		});
	}
	let current = realRoot;
	for (const segment of path.relative(base, absolute).split(path.sep)) {
		current = path.join(current, segment);
		let entry;
		try {
			// oxlint-disable-next-line no-await-in-loop -- Resolve each ancestor before following its child.
			entry = await fs.lstat(current);
		} catch (error) {
			if (
				error instanceof Error &&
				'code' in error &&
				error.code === 'ENOENT'
			) {
				// A planned file or its parent directories may not exist yet.
				continue;
			}
			throw error;
		}
		if (entry.isSymbolicLink()) {
			try {
				// oxlint-disable-next-line no-await-in-loop -- Canonicalize the current link before following the remaining path.
				current = await fs.realpath(current);
			} catch {
				throw new CliError('CONFIG_INVALID', {
					details: `Generation cannot resolve symlink: ${current}`,
				});
			}
			if (!inside(realRoot, current)) {
				throw new CliError('CONFIG_INVALID', {
					details: `Generation symlink resolves outside the project: ${filePath}`,
				});
			}
		}
	}
	if (current === realRoot) {
		throw new CliError('CONFIG_INVALID', {
			details: 'A generation file cannot be the project directory.',
		});
	}
	return current;
};

/** Build a containment check shared by setup planning and recovery. */
export const createProjectPathResolver = async (root: string) => {
	const absoluteRoot = path.resolve(root);
	const realRoot = await fs.realpath(absoluteRoot);
	return (filePath: string) =>
		resolveProjectPath(absoluteRoot, realRoot, filePath);
};
