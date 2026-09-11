import fs from 'node:fs/promises';
import path from 'node:path';

import { rollbackFileEdits } from '../../commands/generate/templates/shared/file-plan';
import type { FileEdit } from '../../commands/generate/templates/shared/file-plan';
import { createProjectPathResolver } from '../../commands/generate/templates/shared/project-paths';
import { CliError } from '../../core/errors';

const journalPath = (root: string) => path.join(root, '.c15t-generation.json');

/** Validate every target before any journal or generated-file write. */
const resolveJournalEdits = async (root: string, edits: FileEdit[]) => {
	const resolvePath = await createProjectPathResolver(root);
	return await Promise.all(
		edits.map(async (edit) => ({
			...edit,
			path: await resolvePath(edit.path),
		}))
	);
};

/** Saves original contents before applying generation edits. */
export const saveGenerationJournal = async function saveGenerationJournal(
	root: string,
	edits: FileEdit[]
): Promise<void> {
	const resolved = await resolveJournalEdits(root, edits);
	await fs.writeFile(
		journalPath(root),
		JSON.stringify({ edits: resolved, version: 1 }),
		{
			encoding: 'utf-8',
			flag: 'wx',
			mode: 0o600,
		}
	);
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
				'An interrupted generation has pending file edits. Repeat the original generation command with --resume --apply, keeping its mode, framework, output and package-source flags, to restore them before continuing.',
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
			typeof edit.after !== 'string'
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
	const resolved = await resolveJournalEdits(root, edits);
	await rollbackFileEdits(resolved);
	await clearGenerationJournal(root);
	return true;
};
