import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { CodemodRunOptions, CodemodRunResult } from '../runner';

type Codemod = (options: CodemodRunOptions) => Promise<CodemodRunResult>;

const createdDirs: string[] = [];

/** Writes `files` into a fresh project directory. */
export const createProject = async function createProject(
	files: Record<string, string>
): Promise<string> {
	const rootDir = await mkdtemp(join(tmpdir(), 'c15t-codemod-'));
	createdDirs.push(rootDir);
	await Promise.all(
		Object.entries(files).map(async ([path, content]) => {
			const filePath = join(rootDir, path);
			await mkdir(dirname(filePath), { recursive: true });
			await writeFile(filePath, content, 'utf-8');
		})
	);
	return rootDir;
};

/** Runs a codemod over one file and returns the result and the file's new text. */
export const transformFile = async function transformFile(
	codemod: Codemod,
	content: string,
	{ fileName = 'consent.tsx', dryRun = false } = {}
): Promise<{ result: CodemodRunResult; updated: string; rootDir: string }> {
	const rootDir = await createProject({ [fileName]: content });
	const result = await codemod({ dryRun, projectRoot: rootDir });
	return {
		result,
		rootDir,
		updated: await readFile(join(rootDir, fileName), 'utf-8'),
	};
};

/** Runs a codemod twice in separate sessions and returns the text after each run. */
export const transformTwice = async function transformTwice(
	codemod: Codemod,
	content: string,
	fileName = 'consent.tsx'
): Promise<{ first: string; second: string; secondResult: CodemodRunResult }> {
	const rootDir = await createProject({ [fileName]: content });
	await codemod({ dryRun: false, projectRoot: rootDir });
	const first = await readFile(join(rootDir, fileName), 'utf-8');
	const secondResult = await codemod({ dryRun: false, projectRoot: rootDir });
	const second = await readFile(join(rootDir, fileName), 'utf-8');
	return { first, second, secondResult };
};

/** Removes every project directory the helpers created. */
export const cleanupProjects = async function cleanupProjects(): Promise<void> {
	await Promise.all(
		createdDirs
			.splice(0)
			.map((dir) => rm(dir, { force: true, recursive: true }))
	);
};
