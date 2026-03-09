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
		if (property.wasForgotten() || getPropertyName(property) !== 'store') {
			continue;
		}

		const parentObject = property.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		const storeObject = property.getInitializerIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!parentObject || !storeObject) {
			continue;
		}

		const offlinePolicyProperty = getProperty(storeObject, 'offlinePolicy');
		const offlinePolicyObject = offlinePolicyProperty?.getInitializerIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!offlinePolicyProperty || !offlinePolicyObject) {
			continue;
		}

		const policyPackProperty =
			getProperty(offlinePolicyObject, 'policyPack') ??
			getProperty(offlinePolicyObject, 'policies');
		if (!policyPackProperty) {
			continue;
		}

		const initializerText = policyPackProperty.getInitializer()?.getText();
		if (!initializerText) {
			continue;
		}

		if (!getProperty(parentObject, 'policyPacks')) {
			parentObject.addPropertyAssignment({
				name: 'policyPacks',
				initializer: initializerText,
			});
			summaries.push('store.offlinePolicy.policyPack -> policyPacks');
		} else {
			summaries.push('removed duplicate store.offlinePolicy policy pack');
		}

		const legacyPoliciesProperty = getProperty(offlinePolicyObject, 'policies');
		const legacyPolicyPackProperty = getProperty(
			offlinePolicyObject,
			'policyPack'
		);
		legacyPoliciesProperty?.remove();
		legacyPolicyPackProperty?.remove();
		operations += 1;

		if (offlinePolicyObject.getProperties().length === 0) {
			offlinePolicyProperty.remove();
			operations += 1;
			summaries.push('removed empty store.offlinePolicy');
		}

		if (storeObject.getProperties().length === 0) {
			property.remove();
			operations += 1;
			summaries.push('removed empty store options object');
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
