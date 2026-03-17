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

type CodemodResult = {
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

/**
 * Finds offline-mode config objects that lack offlinePolicy.policyPacks and
 * injects a starter policy pack as the default.
 */
const STARTER_POLICY_PACK =
	'[\n\t\t\tpolicyPackPresets.europeOptIn(),\n\t\t\tpolicyPackPresets.californiaOptOut(),\n\t\t\tpolicyPackPresets.worldNoBanner(),\n\t\t]';

function transformSourceFile(
	sourceFile: import('ts-morph').SourceFile
): CodemodResult {
	let operations = 0;
	const summaries: string[] = [];
	let needsImport = false;

	const propertyAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAssignment
	);

	for (const property of propertyAssignments) {
		if (property.wasForgotten() || getPropertyName(property) !== 'mode') {
			continue;
		}

		const initializer = property.getInitializerIfKind(SyntaxKind.StringLiteral);
		if (!initializer || initializer.getLiteralValue() !== 'offline') {
			continue;
		}

		const configObject = property.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!configObject) {
			continue;
		}

		// Check if offlinePolicy already exists with policyPacks
		const offlinePolicyProperty = getProperty(configObject, 'offlinePolicy');
		if (offlinePolicyProperty) {
			const offlinePolicyObject = offlinePolicyProperty.getInitializerIfKind(
				SyntaxKind.ObjectLiteralExpression
			);
			if (
				offlinePolicyObject &&
				getProperty(offlinePolicyObject, 'policyPacks')
			) {
				continue;
			}
		}

		// Add offlinePolicy with a starter pack if missing entirely
		if (!offlinePolicyProperty) {
			configObject.addPropertyAssignment({
				name: 'offlinePolicy',
				initializer: `{\n\t\tpolicyPacks: ${STARTER_POLICY_PACK},\n\t}`,
			});
			operations += 1;
			needsImport = true;
			summaries.push('added offlinePolicy.policyPacks with starter presets');
		} else {
			// offlinePolicy exists but has no policyPacks field — add it
			const offlinePolicyObject = offlinePolicyProperty.getInitializerIfKind(
				SyntaxKind.ObjectLiteralExpression
			);
			if (offlinePolicyObject) {
				offlinePolicyObject.addPropertyAssignment({
					name: 'policyPacks',
					initializer: STARTER_POLICY_PACK,
				});
				operations += 1;
				needsImport = true;
				summaries.push('added policyPacks: starter presets');
			}
		}
	}

	// Add import for policyPackPresets if needed and not already imported
	if (needsImport) {
		const existingImports = sourceFile.getImportDeclarations();
		const alreadyImported = existingImports.some((decl) => {
			const namedImports = decl.getNamedImports();
			return namedImports.some((ni) => ni.getName() === 'policyPackPresets');
		});

		if (!alreadyImported) {
			// Try to find an existing c15t import to add to
			const c15tImport = existingImports.find((decl) => {
				const moduleSpecifier = decl.getModuleSpecifierValue();
				return (
					moduleSpecifier === 'c15t' ||
					moduleSpecifier === '@c15t/react' ||
					moduleSpecifier === '@c15t/nextjs'
				);
			});

			if (c15tImport) {
				c15tImport.addNamedImport('policyPackPresets');
				summaries.push('added policyPackPresets to existing import');
			} else {
				sourceFile.addImportDeclaration({
					namedImports: ['policyPackPresets'],
					moduleSpecifier: 'c15t',
				});
				summaries.push("added import { policyPackPresets } from 'c15t'");
			}
			operations += 1;
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

/**
 * Adds `offlinePolicy.policyPacks` starter presets
 * to offline-mode configs that lack policy packs (v1 -> v2 migration).
 */
export async function runOfflineAddPolicyPacksCodemod(
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
