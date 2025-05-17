/**
 * Templates module for generating configuration files
 * These functions generate template configuration content for different storage modes
 */

import { Project, type SourceFile, SyntaxKind } from 'ts-morph';
import type { AvailiblePackages } from '../detection';

const HTML_TAG_REGEX = /<html[^>]*>([\s\S]*)<\/html>/;
const BODY_TAG_REGEX = /<body[^>]*>([\s\S]*)<\/body>/;
const BODY_OPENING_TAG_REGEX = /<body[^>]*>/;
const HTML_CONTENT_REGEX = /([\s\S]*<\/html>)/;

interface UpdateReactLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailiblePackages;
}

function findLayoutFile(
	project: Project,
	projectRoot: string
): SourceFile | undefined {
	const layoutPatterns = [
		'**/app.tsx',
		'**/App.tsx',
		'**/app/app.tsx',
		'**/src/app/app.tsx',
		'**/layout.tsx',
		'**/Layout.tsx',
		'**/app/layout.tsx',
		'**/src/app/layout.tsx',
	];

	for (const pattern of layoutPatterns) {
		const files = project.addSourceFilesAtPaths(`${projectRoot}/${pattern}`);
		if (files.length > 0) {
			return files[0];
		}
	}
}

function generateOptionsText(
	mode: string,
	backendURL?: string,
	useEnvFile?: boolean
): string {
	switch (mode) {
		case 'c15t':
			return `{
				mode: 'c15t',
				backendURL: ${useEnvFile ? 'process.env.NEXT_PUBLIC_C15T_URL' : `'${backendURL || 'https://your-instance.c15t.dev'}'`},
			}`;
		case 'custom':
			return `{
				mode: 'custom',
				endpointHandlers: createCustomHandlers(),
			}`;
		default:
			return `{
				mode: 'offline',
			}`;
	}
}

function updateImports(
	layoutFile: SourceFile,
	packageName: string,
	mode: string
) {
	const requiredImports = [
		'ConsentManagerProvider',
		'CookieBanner',
		'ConsentManagerDialog',
	];
	let hasC15tImport = false;

	for (const importDecl of layoutFile.getImportDeclarations()) {
		if (importDecl.getModuleSpecifierValue() === packageName) {
			hasC15tImport = true;
			const namedImports = importDecl.getNamedImports().map((i) => i.getName());
			const missingImports = requiredImports.filter(
				(imp) => !namedImports.includes(imp)
			);
			if (missingImports.length > 0) {
				importDecl.addNamedImports(missingImports);
			}
			break;
		}
	}

	if (!hasC15tImport) {
		layoutFile.addImportDeclaration({
			namedImports: requiredImports,
			moduleSpecifier: packageName,
		});
	}

	if (mode === 'custom') {
		layoutFile.addImportDeclaration({
			namedImports: ['createCustomHandlers'],
			moduleSpecifier: './consent-handlers',
		});
	}
}

function wrapJsxContent(originalJsx: string, optionsText: string): string {
	const hasHtmlTag =
		originalJsx.includes('<html') || originalJsx.includes('</html>');
	const hasBodyTag =
		originalJsx.includes('<body') || originalJsx.includes('</body>');

	const providerWrapper = (content: string) => `
		<ConsentManagerProvider options={${optionsText}}>
			<CookieBanner />
			<ConsentManagerDialog />
			${content}
		</ConsentManagerProvider>
	`;

	if (hasHtmlTag) {
		const htmlMatch = originalJsx.match(HTML_TAG_REGEX);
		const htmlContent = htmlMatch?.[1] || '';
		if (!htmlContent) {
			return providerWrapper(originalJsx);
		}

		const bodyMatch = htmlContent.match(BODY_TAG_REGEX);
		if (!bodyMatch) {
			return originalJsx.replace(
				HTML_CONTENT_REGEX,
				`<html>${providerWrapper('$1')}</html>`
			);
		}

		const bodyContent = bodyMatch[1] || '';
		const bodyOpeningTag =
			originalJsx.match(BODY_OPENING_TAG_REGEX)?.[0] || '<body>';

		return originalJsx.replace(
			BODY_TAG_REGEX,
			`${bodyOpeningTag}${providerWrapper(bodyContent)}</body>`
		);
	}

	if (hasBodyTag) {
		const bodyMatch = originalJsx.match(BODY_TAG_REGEX);
		const bodyContent = bodyMatch?.[1] || '';
		if (!bodyContent) {
			return providerWrapper(originalJsx);
		}

		const bodyOpeningTag =
			originalJsx.match(BODY_OPENING_TAG_REGEX)?.[0] || '<body>';
		return originalJsx.replace(
			BODY_TAG_REGEX,
			`${bodyOpeningTag}${providerWrapper(bodyContent)}</body>`
		);
	}

	return providerWrapper(originalJsx);
}

/**
 * Updates or creates a React layout file with ConsentManagerProvider
 *
 * @param projectRoot - The root directory of the project
 * @param mode - The storage mode ('c15t', 'offline', or 'custom')
 * @param backendURL - URL for the c15t backend/API (for 'c15t' mode)
 * @param useEnvFile - Whether to use environment variable for backendURL
 * @returns Information about the update
 */
export async function updateReactLayout({
	projectRoot,
	mode,
	pkg,
	backendURL,
	useEnvFile,
}: UpdateReactLayoutOptions): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
}> {
	const project = new Project();
	const layoutFile = findLayoutFile(project, projectRoot);

	if (!layoutFile) {
		return { updated: false, filePath: null, alreadyModified: false };
	}

	// Check if file already has imports from our package
	const existingImports = layoutFile.getImportDeclarations();
	const hasPackageImport = existingImports.some(
		(importDecl) => importDecl.getModuleSpecifierValue() === pkg
	);
	if (hasPackageImport) {
		return {
			updated: false,
			filePath: layoutFile.getFilePath(),
			alreadyModified: true,
		};
	}

	updateImports(layoutFile, pkg, mode);
	const optionsText = generateOptionsText(mode, backendURL, useEnvFile);

	const returnStatement = layoutFile.getDescendantsOfKind(
		SyntaxKind.ReturnStatement
	)[0];
	if (!returnStatement) {
		return {
			updated: false,
			filePath: layoutFile.getFilePath(),
			alreadyModified: false,
		};
	}

	const expression = returnStatement.getExpression();
	if (!expression) {
		return {
			updated: false,
			filePath: layoutFile.getFilePath(),
			alreadyModified: false,
		};
	}

	const originalJsx = expression.getText();
	const newJsx = wrapJsxContent(originalJsx, optionsText);
	returnStatement.replaceWithText(`return ${newJsx}`);

	await layoutFile.save();
	return {
		updated: true,
		filePath: layoutFile.getFilePath(),
		alreadyModified: false,
	};
}
