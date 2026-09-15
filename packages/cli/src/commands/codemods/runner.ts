import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { Project } from 'ts-morph';
import type { SourceFile } from 'ts-morph';

import { forEachSequential } from '../../utils/for-each-sequential';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
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
}

/** Collect application sources in a stable order without following symlinks. */
export const collectSourceFiles = async (root: string): Promise<string[]> => {
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
					SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())
				) {
					files.push(entryPath);
				}
			},
		});
	};
	await walk(root);
	return files.sort();
};

/** Reuse source parsing across a sequence of migration transforms. */
export const createCodemodSession = async (
	projectRoot: string
): Promise<CodemodSession> => ({
	filePaths: await collectSourceFiles(projectRoot),
	project: new Project({
		compilerOptions: { allowJs: true },
		skipAddingFilesFromTsConfig: true,
	}),
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
