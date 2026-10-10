import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { Project } from 'ts-morph';
import type { SourceFile } from 'ts-morph';

import { forEachSequential } from '../../utils/for-each-sequential';

const SOURCE_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.mts',
	'.cts',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
]);
const IGNORED_DIRECTORIES = new Set([
	'.git',
	'.next',
	'.nuxt',
	'.svelte-kit',
	'.astro',
	'.turbo',
	'.c15t',
	'coverage',
	'dist',
	'dist-types',
	'build',
	'node_modules',
	'out',
]);

export interface CodemodSession {
	project: Project;
	filePaths: string[];
	/**
	 * Latest text of files edited by `runTextTransform`, keyed by path, so a
	 * later transform builds on an earlier one's edits even in a dry run.
	 */
	texts: Map<string, string>;
}

export interface CodemodRunOptions {
	/** Root directory containing the application source. */
	projectRoot: string;
	/** Inspect changes without saving files. */
	dryRun: boolean;
	/** Shared parser and inventory when running multiple transforms. */
	session?: CodemodSession;
}

export interface CodemodRunResult {
	totalFiles: number;
	changedFiles: {
		filePath: string;
		operations: number;
		summaries: string[];
		before?: string;
		after?: string;
	}[];
	errors: { filePath: string; error: string }[];
	/** Things the codemod skipped on purpose and the user should check. */
	warnings?: { filePath: string; message: string }[];
}

/** Collect files with these extensions in a stable order without following symlinks. */
export const collectFiles = async (
	root: string,
	extensions: ReadonlySet<string>
): Promise<string[]> => {
	const files: string[] = [];
	const walk = async (directory: string): Promise<void> => {
		const entries = await readdir(directory, { withFileTypes: true });
		await forEachSequential(entries, {
			run: async (entry) => {
				if (entry.isSymbolicLink()) {
					return;
				}
				const entryPath = join(directory, entry.name);
				if (entry.isDirectory()) {
					if (!IGNORED_DIRECTORIES.has(entry.name)) {
						await walk(entryPath);
					}
				} else if (
					entry.isFile() &&
					extensions.has(extname(entry.name).toLowerCase())
				) {
					files.push(entryPath);
				}
			},
		});
	};
	await walk(root);
	return files.sort();
};

/** Collect application sources in a stable order without following symlinks. */
export const collectSourceFiles = (root: string): Promise<string[]> =>
	collectFiles(root, SOURCE_EXTENSIONS);

/** Reuse source parsing across a sequence of migration transforms. */
export const createCodemodSession = async (
	projectRoot: string
): Promise<CodemodSession> => ({
	filePaths: await collectSourceFiles(projectRoot),
	project: new Project({
		compilerOptions: { allowJs: true },
		skipAddingFilesFromTsConfig: true,
	}),
	texts: new Map(),
});

/** Apply one transform and report exact before/after source for review. */
export const runTransform = async (
	options: CodemodRunOptions,
	transform: (sourceFile: SourceFile) => {
		changed: boolean;
		operations: number;
		summaries: string[];
	}
): Promise<CodemodRunResult> => {
	const { project, filePaths } =
		options.session ?? (await createCodemodSession(options.projectRoot));
	const result: CodemodRunResult = {
		changedFiles: [],
		errors: [],
		totalFiles: filePaths.length,
	};
	await forEachSequential(filePaths, {
		run: async (filePath) => {
			try {
				const source =
					project.getSourceFile(filePath) ??
					project.addSourceFileAtPath(filePath);
				const before = source.getFullText();
				const transformed = transform(source);
				if (!transformed.changed) {
					return;
				}
				const after = source.getFullText();
				if (!options.dryRun) {
					await source.save();
				}
				result.changedFiles.push({
					after,
					before,
					filePath,
					operations: transformed.operations,
					summaries: transformed.summaries,
				});
			} catch (error) {
				result.errors.push({
					error: error instanceof Error ? error.message : String(error),
					filePath,
				});
			}
		},
	});
	return result;
};

/**
 * Apply a text transform to files the TypeScript parser does not read, such
 * as stylesheets. Reports the same before/after shape as `runTransform`.
 */
export const runTextTransform = async (
	options: CodemodRunOptions,
	extensions: ReadonlySet<string>,
	transform: (
		text: string,
		filePath: string
	) => { text: string; operations: number; summaries: string[] }
): Promise<CodemodRunResult> => {
	const filePaths = await collectFiles(options.projectRoot, extensions);
	const texts = options.session?.texts;
	const result: CodemodRunResult = {
		changedFiles: [],
		errors: [],
		totalFiles: filePaths.length,
	};
	await forEachSequential(filePaths, {
		run: async (filePath) => {
			try {
				const before =
					texts?.get(filePath) ?? (await readFile(filePath, 'utf-8'));
				const transformed = transform(before, filePath);
				if (transformed.text === before) {
					return;
				}
				texts?.set(filePath, transformed.text);
				if (!options.dryRun) {
					await writeFile(filePath, transformed.text, 'utf-8');
				}
				result.changedFiles.push({
					after: transformed.text,
					before,
					filePath,
					operations: transformed.operations,
					summaries: transformed.summaries,
				});
			} catch (error) {
				result.errors.push({
					error: error instanceof Error ? error.message : String(error),
					filePath,
				});
			}
		},
	});
	return result;
};

/** Combine the results of transforms that scanned different file sets. */
export const mergeResults = (
	...results: CodemodRunResult[]
): CodemodRunResult => ({
	changedFiles: results.flatMap((result) => result.changedFiles),
	errors: results.flatMap((result) => result.errors),
	totalFiles: results.reduce((total, result) => total + result.totalFiles, 0),
	warnings: results.flatMap((result) => result.warnings ?? []),
});
