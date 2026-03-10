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

type PolicyPacksCodemodResult = {
	changed: boolean;
	operations: number;
	summaries: string[];
};

export interface CodemodRunOptions {
	projectRoot: string;
	dryRun: boolean;
}

export interface CodemodRunResult {
	totalFiles: number;
	changedFiles: Array<{
		filePath: string;
		operations: number;
		summaries: string[];
	}>;
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

function transformSourceFile(
	sourceFile: import('ts-morph').SourceFile
): PolicyPacksCodemodResult {
	let operations = 0;
	const summaries: string[] = [];

	const propertyAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAssignment
	);
	for (const property of propertyAssignments) {
		if (
			property.wasForgotten() ||
			getPropertyName(property) !== 'policyPacks'
		) {
			continue;
		}

		const parentObject = property.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		const initializerText = property.getInitializer()?.getText();
		if (!parentObject || !initializerText) {
			continue;
		}

		let storeProperty = getProperty(parentObject, 'store');
		let storeObject = storeProperty?.getInitializerIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!storeObject) {
			parentObject.addPropertyAssignment({
				name: 'store',
				initializer: '{}',
			});
			storeProperty = getProperty(parentObject, 'store');
			storeObject = storeProperty?.getInitializerIfKind(
				SyntaxKind.ObjectLiteralExpression
			);
		}

		if (!storeObject) {
			continue;
		}

		let offlinePolicyProperty = getProperty(storeObject, 'offlinePolicy');
		let offlinePolicyObject = offlinePolicyProperty?.getInitializerIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!offlinePolicyObject) {
			storeObject.addPropertyAssignment({
				name: 'offlinePolicy',
				initializer: '{}',
			});
			offlinePolicyProperty = getProperty(storeObject, 'offlinePolicy');
			offlinePolicyObject = offlinePolicyProperty?.getInitializerIfKind(
				SyntaxKind.ObjectLiteralExpression
			);
		}

		if (!offlinePolicyObject) {
			continue;
		}

		if (!getProperty(offlinePolicyObject, 'policies')) {
			offlinePolicyObject.addPropertyAssignment({
				name: 'policies',
				initializer: initializerText,
			});
			summaries.push('policyPacks -> store.offlinePolicy.policies');
		} else {
			summaries.push('removed duplicate top-level policyPacks');
		}

		const legacyPolicyPackProperty = getProperty(
			offlinePolicyObject,
			'policyPack'
		);
		legacyPolicyPackProperty?.remove();
		property.remove();
		operations += 1;

		if (legacyPolicyPackProperty) {
			operations += 1;
			summaries.push('removed legacy store.offlinePolicy.policyPack');
		}
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

export async function runOfflinePolicyPackToPolicyPacksCodemod(
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
