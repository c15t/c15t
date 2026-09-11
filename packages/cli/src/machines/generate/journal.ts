import fs from 'node:fs/promises';
import path from 'node:path';

import { rollbackFileEdits } from '../../commands/generate/templates/shared/file-plan';
import type { FileEdit } from '../../commands/generate/templates/shared/file-plan';
import { CliError } from '../../core/errors';

const journalPath = (root: string) => path.join(root, '.c15t-generation.json');

/** Reject symlinks in existing recovery targets and their project ancestors. */
const validateRecoveryPath = async (
	root: string,
	filePath: string
): Promise<void> => {
	let current = path.resolve(root);
	for (const segment of path.relative(current, filePath).split(path.sep)) {
		current = path.join(current, segment);
		try {
			// oxlint-disable-next-line no-await-in-loop -- Inspect ancestors before following their children.
			if ((await fs.lstat(current)).isSymbolicLink()) {
				throw new CliError('CONFIG_INVALID', {
					details: `Recovery cannot pass through a symlink: ${current}`,
				});
			}
		} catch (error) {
			if (
				error instanceof Error &&
				'code' in error &&
				error.code === 'ENOENT'
			) {
				// Interrupted generation may not have created this directory yet.
				return;
			}
			throw error;
		}
	}
};

/** Saves original contents before applying generation edits. */
export const saveGenerationJournal = async function saveGenerationJournal(
	root: string,
	edits: FileEdit[]
): Promise<void> {
	await fs.writeFile(journalPath(root), JSON.stringify({ edits, version: 1 }), {
		encoding: 'utf-8',
		flag: 'wx',
		mode: 0o600,
	});
};

/** Removes the completed transaction's recovery record. */
export const clearGenerationJournal = async function clearGenerationJournal(
	root: string
): Promise<void> {
	await fs.rm(journalPath(root), { force: true });
};

/** Restores interrupted generation before replaying setup from a fresh state. */
export const recoverGeneration = async function recoverGeneration(
	root: string,
	resume: boolean
): Promise<boolean> {
	let content: string;
	try {
		content = await fs.readFile(journalPath(root), 'utf-8');
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return false;
		}
		throw error;
	}
	if (!resume) {
		throw new CliError('CONFIG_INVALID', {
			details:
				'An interrupted generation has pending file edits. Run generate --resume to restore them before continuing.',
		});
	}
	const journal: unknown = JSON.parse(content);
	if (
		!journal ||
		typeof journal !== 'object' ||
		!('version' in journal) ||
		journal.version !== 1 ||
		!('edits' in journal) ||
		!Array.isArray(journal.edits)
	) {
		throw new CliError('CONFIG_INVALID', {
			details:
				'Invalid generation recovery journal. Inspect .c15t-generation.json before continuing.',
		});
	}
	const edits: FileEdit[] = journal.edits.map((edit: unknown) => {
		if (
			!edit ||
			typeof edit !== 'object' ||
			!('path' in edit) ||
			typeof edit.path !== 'string' ||
			!('before' in edit) ||
			!(edit.before === null || typeof edit.before === 'string') ||
			!('after' in edit) ||
			typeof edit.after !== 'string' ||
			!path.resolve(edit.path).startsWith(`${path.resolve(root)}${path.sep}`)
		) {
			throw new CliError('CONFIG_INVALID', {
				details: 'Invalid file entry in generation recovery journal.',
			});
		}
		return {
			after: edit.after,
			before: edit.before,
			path: path.resolve(edit.path),
		};
	});
	// Validate the entire journal before restoring any file.
	await Promise.all(edits.map((edit) => validateRecoveryPath(root, edit.path)));
	await rollbackFileEdits(edits);
	await clearGenerationJournal(root);
	return true;
};
