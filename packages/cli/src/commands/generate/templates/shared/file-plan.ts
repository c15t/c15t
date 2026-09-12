/* oxlint-disable no-await-in-loop -- Apply and restore edits in order so rollback covers exactly the completed writes. */
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createProjectPathResolver } from './project-paths';

/** A proposed UTF-8 file edit, including the original contents for rollback. */
export interface FileEdit {
	path: string;
	before: string | null;
	after: string;
}

const currentPlan = new AsyncLocalStorage<Map<string, FileEdit>>();
const plannedPaths = new AsyncLocalStorage<(file: string) => Promise<string>>();

/** Validate a setup input before an external parser opens its contents. */
export const resolvePlannedPath = (file: string): Promise<string> =>
	plannedPaths.getStore()?.(file) ?? Promise.resolve(path.resolve(file));

/** Read only a project-contained file while collecting a setup plan. */
export const readFile = async (
	file: string,
	encoding: 'utf8' | 'utf-8'
): Promise<string> => fs.readFile(await resolvePlannedPath(file), encoding);

const readExisting = async function readExisting(
	filePath: string
): Promise<string | null> {
	try {
		return await readFile(filePath, 'utf-8');
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return null;
		}
		throw error;
	}
};

/** Records writes while planning; writes normally when called outside a plan. */
export const writeFile = async function writeFile(
	filePath: string,
	content: string,
	_encoding: 'utf-8' | 'utf8' = 'utf-8'
): Promise<void> {
	const plan = currentPlan.getStore();
	if (!plan) {
		await fs.writeFile(filePath, content, 'utf-8');
		return;
	}
	const absolute = path.resolve(filePath);
	const before = plan.get(absolute)?.before ?? (await readExisting(absolute));
	plan.set(absolute, { after: content, before, path: absolute });
};

/** Refuses to replace an existing generated file with different contents. */
export const createFile = async function createFile(
	filePath: string,
	content: string,
	encoding: 'utf-8' | 'utf8' = 'utf-8'
): Promise<void> {
	const existing = await readExisting(filePath);
	if (existing !== null && existing !== content) {
		throw new Error(`Refusing to overwrite existing file: ${filePath}`);
	}
	await writeFile(filePath, content, encoding);
};

const appendFile = async function appendFile(
	filePath: string,
	content: string
): Promise<void> {
	const original =
		currentPlan.getStore()?.get(path.resolve(filePath))?.after ??
		(await readExisting(filePath)) ??
		'';
	await writeFile(filePath, original + content);
};

const mkdir = async function mkdir(
	directory: string,
	options: { recursive: true }
): Promise<string | undefined> {
	if (currentPlan.getStore()) {
		return undefined;
	}
	return await fs.mkdir(directory, options);
};

/** Collects all file writes without changing the project. */
export const collectFileEdits = async function collectFileEdits<Result>(
	generate: () => Promise<Result>,
	options: { projectRoot?: string } = {}
): Promise<{ result: Result; edits: FileEdit[] }> {
	const edits = new Map<string, FileEdit>();
	const collect = () => currentPlan.run(edits, generate);
	const result = options.projectRoot
		? await plannedPaths.run(
				await createProjectPathResolver(options.projectRoot),
				collect
			)
		: await collect();
	return {
		edits: [...edits.values()].filter((edit) => edit.before !== edit.after),
		result,
	};
};

/** Restores applied edits; refuses to overwrite intervening user changes. */
export const rollbackFileEdits = async function rollbackFileEdits(
	edits: FileEdit[]
): Promise<void> {
	const errors: unknown[] = [];
	for (const edit of edits.toReversed()) {
		try {
			const current = await readExisting(edit.path);
			if (current === edit.before) {
				continue;
			}
			if (current !== edit.after) {
				throw new Error(`File changed since generation: ${edit.path}`);
			}
			if (edit.before === null) {
				await fs.unlink(edit.path);
			} else {
				await fs.writeFile(edit.path, edit.before, 'utf-8');
			}
		} catch (error) {
			errors.push(error);
		}
	}
	if (errors.length) {
		throw new AggregateError(
			errors,
			'Some generated files could not be restored.'
		);
	}
};

/** Applies a reviewed plan and restores every applied file if a write fails. */
export const applyFileEdits = async function applyFileEdits(
	edits: FileEdit[],
	options: { signal?: AbortSignal } = {}
): Promise<void> {
	const applied: FileEdit[] = [];
	try {
		for (const edit of edits) {
			options.signal?.throwIfAborted();
			if ((await readExisting(edit.path)) !== edit.before) {
				throw new Error(`File changed since planning: ${edit.path}`);
			}
			await fs.mkdir(path.dirname(edit.path), { recursive: true });
			// Register before writing so a partial write is included in recovery.
			applied.push(edit);
			try {
				await fs.writeFile(edit.path, edit.after, 'utf-8');
			} catch (error) {
				if (edit.before === null) {
					await fs.rm(edit.path, { force: true });
				} else {
					await fs.writeFile(edit.path, edit.before, 'utf-8');
				}
				applied.pop();
				throw error;
			}
		}
		options.signal?.throwIfAborted();
	} catch (error) {
		try {
			await rollbackFileEdits(applied);
		} catch (rollbackError) {
			throw new AggregateError(
				[error, rollbackError],
				'Generation failed and rollback was incomplete.',
				{ cause: rollbackError }
			);
		}
		throw error;
	}
};

export default { ...fs, appendFile, createFile, mkdir, readFile, writeFile };
