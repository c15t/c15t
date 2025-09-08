/**
 * Pages Directory layout template generator
 * Handles updating Next.js Pages Directory _app.tsx files with ConsentManagerProvider
 */

import { Project, type SourceFile, SyntaxKind } from 'ts-morph';
import type { AvailablePackages } from '~/context/framework-detection';
import {
	generateOptionsText,
	getBaseImports,
	getCustomModeImports,
} from '../../shared/options';

interface UpdatePagesLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
}

function findPagesAppFile(
	project: Project,
	projectRoot: string
): SourceFile | undefined {
	const appPatterns = [
		'pages/_app.tsx',
		'pages/_app.ts',
		'src/pages/_app.tsx',
		'src/pages/_app.ts',
	];

	for (const pattern of appPatterns) {
		const files = project.addSourceFilesAtPaths(`${projectRoot}/${pattern}`);
		if (files.length > 0) {
			return files[0];
		}
	}
}

function updatePagesImports(
	appFile: SourceFile,
	packageName: string,
	mode: string
): void {
	const requiredImports = ['ConsentManagerProvider', ...getBaseImports()];
	const pagesModuleSpecifier = `${packageName}/pages`;
	let hasC15tImport = false;

	for (const importDecl of appFile.getImportDeclarations()) {
		if (importDecl.getModuleSpecifierValue() === pagesModuleSpecifier) {
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
		appFile.addImportDeclaration({
			namedImports: requiredImports,
			moduleSpecifier: pagesModuleSpecifier,
		});
	}

	if (mode === 'custom') {
		for (const customImport of getCustomModeImports()) {
			appFile.addImportDeclaration(customImport);
		}
	}
}

function wrapPagesJsxContent(originalJsx: string, optionsText: string): string {
	const trimmedJsx = originalJsx.trim();
	const hasParentheses = trimmedJsx.startsWith('(') && trimmedJsx.endsWith(')');

	// If original has parentheses, remove them since we'll add our own
	const cleanJsx = hasParentheses
		? trimmedJsx.slice(1, -1).trim()
		: originalJsx;

	const wrappedContent = `
		<ConsentManagerProvider
			initialData={pageProps.initialC15TData}
			options={${optionsText}}
		>
			<CookieBanner />
			<ConsentManagerDialog />
			${cleanJsx}
		</ConsentManagerProvider>
	`;

	return `(${wrappedContent})`;
}

function addServerSideDataComment(
	appFile: SourceFile,
	backendURL?: string,
	useEnvFile?: boolean,
	proxyNextjs?: boolean
): void {
	const existingComments = appFile.getLeadingCommentRanges();

	// Generate the appropriate URL based on configuration
	let urlExample: string;
	if (proxyNextjs) {
		urlExample = "'/api/c15t'";
	} else if (useEnvFile) {
		urlExample = 'process.env.NEXT_PUBLIC_C15T_URL!';
	} else {
		urlExample = `'${backendURL || 'https://your-instance.c15t.dev'}'`;
	}

	const serverSideComment = `/**
 * Note: To get the initial server-side data on other pages, add this to each page:
 *
 * import { withInitialC15TData } from '@c15t/nextjs/pages';
 *
 * export const getServerSideProps = withInitialC15TData(${urlExample});
 *
 * This will automatically pass initialC15TData to pageProps.initialC15TData
 */`;

	// Check if similar comment already exists
	const hasServerSideComment = existingComments.some((comment) =>
		comment.getText().includes('withInitialC15TData')
	);

	if (!hasServerSideComment) {
		appFile.insertText(0, `${serverSideComment}\n\n`);
	}
}

function updateAppComponentTyping(appFile: SourceFile): void {
	const exportAssignment = appFile.getExportAssignment(() => true);
	if (!exportAssignment) {
		return;
	}

	const declaration = exportAssignment.getExpression();
	if (!declaration) {
		return;
	}

	// Check if it's a function declaration that needs typing
	const text = declaration.getText();
	if (text.includes('pageProps') && !text.includes('AppProps')) {
		// Add AppProps import if not present
		const hasAppPropsImport = appFile
			.getImportDeclarations()
			.some(
				(importDecl) =>
					importDecl.getModuleSpecifierValue() === 'next/app' &&
					importDecl
						.getNamedImports()
						.some((namedImport) => namedImport.getName() === 'AppProps')
			);

		if (!hasAppPropsImport) {
			appFile.addImportDeclaration({
				namedImports: ['AppProps'],
				moduleSpecifier: 'next/app',
			});
		}
	}
}

export async function updatePagesLayout({
	projectRoot,
	mode,
	pkg,
	backendURL,
	useEnvFile,
	proxyNextjs,
}: UpdatePagesLayoutOptions): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
}> {
	const project = new Project();
	const appFile = findPagesAppFile(project, projectRoot);

	if (!appFile) {
		return { updated: false, filePath: null, alreadyModified: false };
	}

	// Check if file already has imports from our package
	const existingImports = appFile.getImportDeclarations();
	const pagesModuleSpecifier = `${pkg}/pages`;
	const hasPackageImport = existingImports.some(
		(importDecl) =>
			importDecl.getModuleSpecifierValue() === pagesModuleSpecifier
	);
	if (hasPackageImport) {
		return {
			updated: false,
			filePath: appFile.getFilePath(),
			alreadyModified: true,
		};
	}

	updatePagesImports(appFile, pkg, mode);
	updateAppComponentTyping(appFile);
	addServerSideDataComment(appFile, backendURL, useEnvFile, proxyNextjs);

	const optionsText = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs
	);

	const returnStatement = appFile.getDescendantsOfKind(
		SyntaxKind.ReturnStatement
	)[0];
	if (!returnStatement) {
		return {
			updated: false,
			filePath: appFile.getFilePath(),
			alreadyModified: false,
		};
	}

	const expression = returnStatement.getExpression();
	if (!expression) {
		return {
			updated: false,
			filePath: appFile.getFilePath(),
			alreadyModified: false,
		};
	}

	const originalJsx = expression.getText();
	const newJsx = wrapPagesJsxContent(originalJsx, optionsText);
	returnStatement.replaceWithText(`return ${newJsx}`);

	await appFile.save();
	return {
		updated: true,
		filePath: appFile.getFilePath(),
		alreadyModified: false,
	};
}
