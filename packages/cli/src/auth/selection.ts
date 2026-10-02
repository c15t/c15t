import { randomUUID } from 'node:crypto';
import {
	lstat,
	mkdir,
	readFile,
	rename,
	rm,
	writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

import { CliError } from '../core/errors';

const assertDirectory = async (directory: string): Promise<void> => {
	const entry = await lstat(directory);
	if (!entry.isDirectory() || entry.isSymbolicLink()) {
		throw new CliError('PROJECT_PREFERENCE_INVALID', {
			details: '.c15t must be a regular directory, not a symlink.',
		});
	}
};

/** Read this application's public project preference. No credentials are stored. */
export const getSelectedInstanceId = async (
	cwd = process.cwd()
): Promise<string | null> => {
	try {
		const directory = join(cwd, '.c15t');
		await assertDirectory(directory);
		const filename = join(directory, 'project.json');
		const entry = await lstat(filename);
		if (!entry.isFile() || entry.isSymbolicLink()) {
			throw new Error('Invalid preference file');
		}
		const value: unknown = JSON.parse(await readFile(filename, 'utf8'));
		if (
			!value ||
			typeof value !== 'object' ||
			!('selectedProject' in value) ||
			typeof value.selectedProject !== 'string'
		) {
			throw new Error('Invalid project preference');
		}
		return value.selectedProject;
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return null;
		}
		if (error instanceof CliError) {
			throw error;
		}
		throw new CliError('PROJECT_PREFERENCE_INVALID', {
			details: 'The file is not valid JSON with a selectedProject string.',
		});
	}
};

/** Save a public project ID for setup in this application. */
export const setSelectedInstanceId = async (
	selectedProject: string,
	cwd = process.cwd()
): Promise<void> => {
	const directory = join(cwd, '.c15t');
	await mkdir(directory, { recursive: true });
	await assertDirectory(directory);
	const temporary = join(directory, `project-${randomUUID()}.tmp`);
	try {
		await writeFile(
			temporary,
			`${JSON.stringify({ selectedProject }, null, 2)}\n`,
			{ flag: 'wx', mode: 0o600 }
		);
		await rename(temporary, join(directory, 'project.json'));
	} finally {
		await rm(temporary, { force: true });
	}
};
