import {
	type CallExpression,
	type Expression,
	type MethodDeclaration,
	Node,
	type ObjectLiteralExpression,
	Project,
	type PropertyAssignment,
	type SourceFile,
} from 'ts-morph';

interface UpdateNextConfigOptions {
	projectRoot: string;
	backendURL?: string;
	useEnvFile?: boolean;
}

/**
 * Updates or creates a Next.js config file with API rewrite rules for c15t backend
 *
 * @param options - Configuration options for updating the Next.js config
 * @returns Information about the update operation
 *
 * @throws {Error} When config file parsing fails
 * @throws {TypeError} When config structure is invalid
 *
 * @example
 * ```ts
 * const result = await updateNextConfig({
 *   projectRoot: '/path/to/project',
 *   mode: 'c15t',
 *   backendURL: 'https://api.example.com',
 *   useEnvFile: true,
 *   pkg: '@c15t/nextjs'
 * });
 * ```
 */
export async function updateNextConfig({
	projectRoot,
	backendURL,
	useEnvFile,
}: UpdateNextConfigOptions): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	created: boolean;
}> {
	const project = new Project();
	const configFile = findNextConfigFile(project, projectRoot);

	if (!configFile) {
		// Create a new config file if none exists
		const newConfigPath = `${projectRoot}/next.config.ts`;
		const newConfig = createNewNextConfig(backendURL, useEnvFile);

		const newConfigFile = project.createSourceFile(newConfigPath, newConfig);
		await newConfigFile.save();

		return {
			updated: true,
			filePath: newConfigPath,
			alreadyModified: false,
			created: true,
		};
	}

	// Check if rewrite rule already exists
	if (hasC15tRewriteRule(configFile)) {
		return {
			updated: false,
			filePath: configFile.getFilePath(),
			alreadyModified: true,
			created: false,
		};
	}

	const updated = await updateExistingConfig(
		configFile,
		backendURL,
		useEnvFile
	);

	if (updated) {
		await configFile.save();
	}

	return {
		updated,
		filePath: configFile.getFilePath(),
		alreadyModified: false,
		created: false,
	};
}

/**
 * Finds the Next.js config file in the project
 * Searches for both TypeScript and JavaScript variants
 *
 * @param project - The TypeScript project instance
 * @param projectRoot - Root directory of the project
 * @returns The config file if found, undefined otherwise
 */
function findNextConfigFile(
	project: Project,
	projectRoot: string
): SourceFile | undefined {
	const configPatterns = [
		'next.config.ts',
		'next.config.js',
		'next.config.mjs',
	];

	for (const pattern of configPatterns) {
		const configPath = `${projectRoot}/${pattern}`;
		try {
			const files = project.addSourceFilesAtPaths(configPath);
			if (files.length > 0) {
				return files[0];
			}
		} catch {
			// File doesn't exist, continue to next pattern
		}
	}

	return undefined;
}

/**
 * Checks if the config file already has a c15t rewrite rule
 *
 * @param configFile - The Next.js config source file
 * @returns True if c15t rewrite rule exists
 */
function hasC15tRewriteRule(configFile: SourceFile): boolean {
	const text = configFile.getFullText();
	return text.includes('/api/c15t/') || text.includes("'/api/c15t/:path*'");
}

/**
 * Generates the destination URL for the rewrite rule
 *
 * @param mode - The storage mode
 * @param backendURL - The backend URL
 * @param useEnvFile - Whether to use environment variables
 * @returns The formatted destination URL and whether it should be treated as a template literal
 */
function generateRewriteDestination(
	backendURL?: string,
	useEnvFile?: boolean
): { destination: string; isTemplateLiteral: boolean } {
	if (useEnvFile) {
		return {
			// biome-ignore lint/nursery/noTemplateCurlyInString: This will be transformed into a template literal later
			destination: '${process.env.NEXT_PUBLIC_C15T_URL}/:path*',
			isTemplateLiteral: true,
		};
	}

	return {
		destination: `${backendURL || 'https://your-instance.c15t.dev'}/:path*`,
		isTemplateLiteral: false,
	};
}

/**
 * Creates a new Next.js config file with c15t rewrite rule
 *
 * @param mode - The storage mode
 * @param backendURL - The backend URL
 * @param useEnvFile - Whether to use environment variables
 * @returns The complete config file content
 */
function createNewNextConfig(
	backendURL?: string,
	useEnvFile?: boolean
): string {
	const { destination, isTemplateLiteral } = generateRewriteDestination(
		backendURL,
		useEnvFile
	);
	// Format destination based on whether it's a template literal
	const destinationValue = isTemplateLiteral
		? `\`${destination}\``
		: `'${destination}'`;

	return `import type { NextConfig } from 'next';

const config: NextConfig = {
	async rewrites() {
		return [
			{
				source: '/api/c15t/:path*',
				destination: ${destinationValue},
			},
		];
	},
};

export default config;
`;
}

/**
 * Updates an existing Next.js config file with c15t rewrite rule
 *
 * @param configFile - The existing config source file
 * @param mode - The storage mode
 * @param backendURL - The backend URL
 * @param useEnvFile - Whether to use environment variables
 * @returns True if the config was successfully updated
 */
/**
 * Creates the rewrite rule object string with proper template literal handling
 */
function createRewriteRule(
	destination: string,
	isTemplateLiteral: boolean
): string {
	const destinationValue = isTemplateLiteral
		? `\`${destination}\``
		: `'${destination}'`;
	return `{
		source: '/api/c15t/:path*',
		destination: ${destinationValue},
	}`;
}

function updateExistingConfig(
	configFile: SourceFile,
	backendURL?: string,
	useEnvFile?: boolean
): boolean {
	const { destination, isTemplateLiteral } = generateRewriteDestination(
		backendURL,
		useEnvFile
	);

	// Find the config object
	const configObject = findConfigObject(configFile);
	if (!configObject) {
		return false;
	}

	// Look for existing rewrites method
	const rewritesProperty = configObject.getProperty('rewrites');

	if (rewritesProperty && Node.isMethodDeclaration(rewritesProperty)) {
		// Update existing rewrites method
		return updateExistingRewrites(
			rewritesProperty,
			destination,
			isTemplateLiteral
		);
	}

	if (rewritesProperty && Node.isPropertyAssignment(rewritesProperty)) {
		// Handle property assignment case (less common)
		return updatePropertyAssignmentRewrites(
			rewritesProperty,
			destination,
			isTemplateLiteral
		);
	}

	// Add new rewrites method
	return addNewRewritesMethod(configObject, destination, isTemplateLiteral);
}

/**
 * Finds the main config object in the file
 */
function findConfigObject(configFile: SourceFile) {
	return (
		findConfigFromExportDefault(configFile) ||
		findConfigFromVariableDeclarations(configFile)
	);
}

function findConfigFromExportDefault(configFile: SourceFile) {
	const exportDefault = configFile.getDefaultExportSymbol();

	if (!exportDefault) {
		return undefined;
	}

	const declarations = exportDefault.getDeclarations();
	for (const declaration of declarations) {
		if (Node.isExportAssignment(declaration)) {
			const result = findConfigFromExpression(
				declaration.getExpression(),
				configFile
			);
			if (result) {
				return result;
			}
		}
	}
	return undefined;
}

function findConfigFromExpression(
	expression: Expression,
	configFile: SourceFile
) {
	if (Node.isCallExpression(expression)) {
		return findConfigFromCallExpression(expression, configFile);
	}
	if (Node.isObjectLiteralExpression(expression)) {
		return expression;
	}
	if (Node.isIdentifier(expression)) {
		return findConfigFromIdentifier(expression.getText(), configFile);
	}
	return undefined;
}

function findConfigFromCallExpression(
	expression: CallExpression,
	configFile: SourceFile
) {
	const args = expression.getArguments();
	if (args.length === 0) {
		return undefined;
	}

	const firstArg = args[0];
	if (Node.isCallExpression(firstArg)) {
		const innerArgs = firstArg.getArguments();
		if (innerArgs.length > 0 && Node.isIdentifier(innerArgs[0])) {
			return findConfigFromIdentifier(innerArgs[0].getText(), configFile);
		}
	}
	return undefined;
}

function findConfigFromIdentifier(
	identifierText: string,
	configFile: SourceFile
) {
	const configVar = configFile.getVariableDeclaration(identifierText);
	const initializer = configVar?.getInitializer();
	return initializer && Node.isObjectLiteralExpression(initializer)
		? initializer
		: undefined;
}

function findConfigFromVariableDeclarations(configFile: SourceFile) {
	const variableDeclarations = configFile.getVariableDeclarations();
	for (const varDecl of variableDeclarations) {
		const typeNode = varDecl.getTypeNode();
		if (typeNode?.getText().includes('NextConfig')) {
			const initializer = varDecl.getInitializer();
			if (Node.isObjectLiteralExpression(initializer)) {
				return initializer;
			}
		}
	}
	return undefined;
}

/**
 * Updates an existing rewrites method by adding the c15t rewrite rule
 *
 * @param rewritesMethod - The existing rewrites method declaration
 * @param destination - The destination URL for the rewrite
 * @param isTemplateLiteral - Whether the destination should be a template literal
 * @returns True if successfully updated
 */
function updateExistingRewrites(
	rewritesMethod: MethodDeclaration,
	destination: string,
	isTemplateLiteral: boolean
): boolean {
	const body = rewritesMethod.getBody();
	if (!Node.isBlock(body)) {
		return false;
	}

	const returnStatement = body
		.getStatements()
		.find((stmt) => Node.isReturnStatement(stmt));
	if (!returnStatement || !Node.isReturnStatement(returnStatement)) {
		return false;
	}

	const expression = returnStatement.getExpression();
	if (!expression || !Node.isArrayLiteralExpression(expression)) {
		return false;
	}

	// Add the c15t rewrite rule at the beginning of the array
	const newRewrite = createRewriteRule(destination, isTemplateLiteral);

	const elements = expression.getElements();
	if (elements.length > 0) {
		expression.insertElement(0, newRewrite);
	} else {
		expression.addElement(newRewrite);
	}

	return true;
}

/**
 * Updates a property assignment style rewrites configuration
 *
 * @param rewritesProperty - The rewrites property assignment
 * @param destination - The destination URL for the rewrite
 * @param isTemplateLiteral - Whether the destination should be a template literal
 * @returns True if successfully updated
 */
function updatePropertyAssignmentRewrites(
	rewritesProperty: PropertyAssignment,
	destination: string,
	isTemplateLiteral: boolean
): boolean {
	// This is less common but we should handle it
	const initializer = rewritesProperty.getInitializer();
	if (Node.isArrayLiteralExpression(initializer)) {
		const newRewrite = createRewriteRule(destination, isTemplateLiteral);
		initializer.insertElement(0, newRewrite);
		return true;
	}

	return false;
}

/**
 * Adds a new rewrites method to the config object
 *
 * @param configObject - The config object literal
 * @param destination - The destination URL for the rewrite
 * @param isTemplateLiteral - Whether the destination should be a template literal
 * @returns True if successfully added
 */
function addNewRewritesMethod(
	configObject: ObjectLiteralExpression,
	destination: string,
	isTemplateLiteral: boolean
): boolean {
	const destinationValue = isTemplateLiteral
		? `\`${destination}\``
		: `'${destination}'`;

	const rewritesMethod = `async rewrites() {
		return [
			{
				source: '/api/c15t/:path*',
				destination: ${destinationValue},
			},
		];
	}`;

	configObject.addProperty(rewritesMethod);
	return true;
}
