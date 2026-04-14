import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
	Node,
	type ObjectLiteralExpression,
	Project,
	type PropertyAssignment,
	SyntaxKind,
} from 'ts-morph';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IGNORED_DIRS = new Set([
	'.git',
	'.next',
	'.turbo',
	'coverage',
	'dist',
	'build',
	'node_modules',
	'out',
]);

const LEGACY_KEY = 'ignoreGeoLocation';
const NEXT_KEY = 'overrides';
const DEFAULT_COUNTRY_CODE = 'DE';

type IgnoreGeoLocationResult = {
	changed: boolean;
	operations: number;
	summaries: string[];
};

export interface CodemodRunOptions {
	/**
	 * Absolute or relative project root to scan for source files.
	 */
	projectRoot: string;
	/**
	 * Whether to skip saving transformed files.
	 */
	dryRun: boolean;
}

/**
 * Result summary for a codemod run.
 */
export interface CodemodRunResult {
	/**
	 * Number of source files scanned.
	 */
	totalFiles: number;
	/**
	 * Per-file transformation summaries.
	 */
	changedFiles: Array<{
		filePath: string;
		operations: number;
		summaries: string[];
	}>;
	/**
	 * Non-fatal per-file transform errors.
	 */
	errors: Array<{ filePath: string; error: string }>;
}

function getPropertyName(property: PropertyAssignment): string {
	const rawName = property.getNameNode().getText().trim();
	return rawName.replace(/^['"]|['"]$/g, '');
}

function getProperty(
	objectLiteral: ObjectLiteralExpression,
	name: string
): PropertyAssignment | undefined {
	for (const property of objectLiteral.getProperties()) {
		if (!Node.isPropertyAssignment(property)) {
			continue;
		}

		if (getPropertyName(property) === name) {
			return property;
		}
	}

	return undefined;
}

function objectHasCountry(objectLiteral: ObjectLiteralExpression): boolean {
	for (const property of objectLiteral.getProperties()) {
		if (!Node.isPropertyAssignment(property)) {
			continue;
		}
		if (getPropertyName(property) === 'country') {
			return true;
		}
	}

	return false;
}

function mergeCountryIntoOverridesExpression(
	overridesExpressionText: string,
	ignoreExpressionText: string
): string {
	if (ignoreExpressionText === 'true') {
		return `{ ...(${overridesExpressionText}), country: (${overridesExpressionText})?.country ?? '${DEFAULT_COUNTRY_CODE}' }`;
	}

	if (ignoreExpressionText === 'false') {
		return overridesExpressionText;
	}

	return `${ignoreExpressionText} ? { ...(${overridesExpressionText}), country: (${overridesExpressionText})?.country ?? '${DEFAULT_COUNTRY_CODE}' } : (${overridesExpressionText})`;
}

function transformSourceFile(
	sourceFile: import('ts-morph').SourceFile
): IgnoreGeoLocationResult {
	let operations = 0;
	const summaries: string[] = [];

	const propertyAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAssignment
	);
	for (const property of propertyAssignments) {
		if (property.wasForgotten() || getPropertyName(property) !== LEGACY_KEY) {
			continue;
		}

		const parentObject = property.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!parentObject) {
			continue;
		}

		const ignoreExpressionText =
			property.getInitializer()?.getText()?.trim() ?? 'true';
		const overridesProperty = getProperty(parentObject, NEXT_KEY);

		if (!overridesProperty) {
			if (ignoreExpressionText === 'false') {
				property.remove();
				operations += 1;
				summaries.push('removed ignoreGeoLocation: false');
				continue;
			}

			property.getNameNode().replaceWithText(NEXT_KEY);
			if (ignoreExpressionText === 'true') {
				property.setInitializer(`{ country: '${DEFAULT_COUNTRY_CODE}' }`);
				summaries.push('ignoreGeoLocation -> overrides.country');
			} else {
				property.setInitializer(
					`${ignoreExpressionText} ? { country: '${DEFAULT_COUNTRY_CODE}' } : undefined`
				);
				summaries.push(
					'ignoreGeoLocation expression -> conditional overrides.country'
				);
			}
			operations += 1;
			continue;
		}

		const overridesInitializer = overridesProperty.getInitializer();
		const overridesObject = overridesInitializer?.asKind(
			SyntaxKind.ObjectLiteralExpression
		);

		if (overridesObject) {
			if (!objectHasCountry(overridesObject)) {
				if (ignoreExpressionText === 'true') {
					overridesObject.addPropertyAssignment({
						name: 'country',
						initializer: `'${DEFAULT_COUNTRY_CODE}'`,
					});
					summaries.push('merged ignoreGeoLocation into overrides.country');
					operations += 1;
				} else if (ignoreExpressionText !== 'false') {
					overridesObject.addPropertyAssignment({
						name: 'country',
						initializer: `${ignoreExpressionText} ? '${DEFAULT_COUNTRY_CODE}' : undefined`,
					});
					summaries.push(
						'merged ignoreGeoLocation expression into overrides.country'
					);
					operations += 1;
				}
			}
		} else if (overridesInitializer) {
			const mergedExpression = mergeCountryIntoOverridesExpression(
				overridesInitializer.getText().trim(),
				ignoreExpressionText
			);
			if (mergedExpression !== overridesInitializer.getText().trim()) {
				overridesProperty.setInitializer(mergedExpression);
				summaries.push(
					'merged ignoreGeoLocation into existing overrides expression'
				);
				operations += 1;
			}
		}

		property.remove();
		operations += 1;
		summaries.push('removed ignoreGeoLocation property');
	}

	return {
		changed: operations > 0,
		operations,
		summaries: [...new Set(summaries)],
	};
}

async function collectSourceFiles(rootDir: string): Promise<string[]> {
	const files: string[] = [];

	async function walk(currentDir: string): Promise<void> {
		const entries = await readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isSymbolicLink()) {
				continue;
			}

			if (entry.isDirectory()) {
				if (IGNORED_DIRS.has(entry.name)) {
					continue;
				}
				await walk(join(currentDir, entry.name));
				continue;
			}

			if (!entry.isFile()) {
				continue;
			}

			const extension = extname(entry.name).toLowerCase();
			if (!SUPPORTED_EXTENSIONS.has(extension)) {
				continue;
			}

			files.push(join(currentDir, entry.name));
		}
	}

	await walk(rootDir);
	return files;
}

/**
 * Runs a codemod that migrates ignoreGeoLocation to overrides-based location forcing.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export async function runIgnoreGeoLocationToOverridesCodemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	const project = new Project({
		skipAddingFilesFromTsConfig: true,
		compilerOptions: {
			allowJs: true,
		},
	});
	const filePaths = await collectSourceFiles(options.projectRoot);

	const changedFiles: Array<{
		filePath: string;
		operations: number;
		summaries: string[];
	}> = [];
	const errors: Array<{ filePath: string; error: string }> = [];

	for (const filePath of filePaths) {
		try {
			const sourceFile = project.addSourceFileAtPathIfExists(filePath);
			if (!sourceFile) {
				continue;
			}

			const result = transformSourceFile(sourceFile);
			if (!result.changed) {
				continue;
			}

			changedFiles.push({
				filePath,
				operations: result.operations,
				summaries: result.summaries,
			});

			if (!options.dryRun) {
				await sourceFile.save();
			}
		} catch (error) {
			errors.push({
				filePath,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return {
		totalFiles: filePaths.length,
		changedFiles,
		errors,
	};
}
