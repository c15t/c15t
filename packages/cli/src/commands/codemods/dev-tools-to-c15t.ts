import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	addTodo,
	applyEdits,
	findProperty,
	propertyRemoval,
	referencesOf,
	toTextEdit,
	UNCHANGED,
	unwrapExpression,
} from './source-edits';
import type { TextEdit, TransformResult } from './source-edits';

/** v2 React entries of `@c15t/dev-tools`. v3 serves every name they exported from the framework's `/devtools` entry. */
const OLD_ENTRIES = new Set([
	'@c15t/dev-tools/react',
	'@c15t/dev-tools/tanstack',
]);

/** Components and the plugin factory that took a store `namespace` in v2. */
const NAMESPACE_TAKERS = new Set([
	'C15TDevTools',
	'C15tTanStackDevtoolsPanel',
	'DevTools',
	'c15tDevtools',
	'c15tDevtoolsPlugin',
]);

/** Store helpers the v2 `@c15t/dev-tools` root exported and v3 removed. */
const REMOVED_ROOT = new Set([
	'createDevToolsPanel',
	'createStoreConnector',
	'getC15tStore',
	'isC15tStoreAvailable',
	'StoreConnector',
	'StoreConnectorOptions',
]);

const REMOVED_ROOT_TODO = (name: string) =>
	`${name} was removed. Dev tools read the consent engine; render DevTools inside the provider, or call createDevTools({ kernel }).`;

interface DependencyMap {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

/** Picks the `/devtools` entry that matches how the app installs c15t. */
const devtoolsEntryFor = function devtoolsEntryFor(
	manifest: DependencyMap | null
): string {
	const dependencies = {
		...manifest?.devDependencies,
		...manifest?.dependencies,
	};
	const umbrella = dependencies.c15t;
	const umbrellaMajor = /(?<major>\d+)/u.exec(umbrella ?? '')?.groups?.major;
	const usesUmbrella =
		umbrella !== undefined &&
		(umbrellaMajor === undefined || Number(umbrellaMajor) >= 3);
	const usesNext =
		dependencies.next !== undefined ||
		dependencies['@c15t/nextjs'] !== undefined;
	if (
		usesUmbrella ||
		(!dependencies['@c15t/nextjs'] && !dependencies['@c15t/react'])
	) {
		return usesNext ? 'c15t/next/devtools' : 'c15t/react/devtools';
	}
	return usesNext ? '@c15t/nextjs/devtools' : '@c15t/react/devtools';
};

const planNamespaceProps = function planNamespaceProps(
	named: TsMorphTypes.ImportSpecifier,
	edits: TextEdit[]
): number {
	if (!NAMESPACE_TAKERS.has(named.getName())) {
		return 0;
	}
	let operations = 0;
	for (const reference of referencesOf(named)) {
		const parent = reference.getParent();
		if (
			(Node.isJsxOpeningElement(parent) ||
				Node.isJsxSelfClosingElement(parent)) &&
			parent.getTagNameNode() === reference
		) {
			const attribute = parent.getAttribute('namespace');
			if (attribute) {
				edits.push(propertyRemoval(attribute));
				operations += 1;
			}
			continue;
		}
		if (Node.isCallExpression(parent) && parent.getExpression() === reference) {
			const [argument] = parent.getArguments();
			const object = argument && unwrapExpression(argument);
			const property =
				object && Node.isObjectLiteralExpression(object)
					? findProperty(object, 'namespace')
					: undefined;
			if (property) {
				edits.push(propertyRemoval(property));
				operations += 1;
			}
		}
	}
	return operations;
};

const transformWith = (entry: string) =>
	function transformSourceFile(
		sourceFile: TsMorphTypes.SourceFile
	): TransformResult {
		const edits: TextEdit[] = [];
		const summaries = new Set<string>();
		let operations = 0;
		for (const declaration of sourceFile.getImportDeclarations()) {
			const specifier = declaration.getModuleSpecifierValue();
			if (OLD_ENTRIES.has(specifier)) {
				const quote = declaration.getModuleSpecifier().getText().charAt(0);
				edits.push(
					toTextEdit(
						declaration.getModuleSpecifier(),
						`${quote}${entry}${quote}`
					)
				);
				summaries.add(`${specifier} -> ${entry}`);
				operations += 1;
				for (const named of declaration.getNamedImports()) {
					const removed = planNamespaceProps(named, edits);
					if (removed > 0) {
						summaries.add('removed namespace prop');
						operations += removed;
					}
				}
				continue;
			}
			if (specifier !== '@c15t/dev-tools') {
				continue;
			}
			for (const named of declaration.getNamedImports()) {
				if (
					REMOVED_ROOT.has(named.getName()) &&
					addTodo(declaration, REMOVED_ROOT_TODO(named.getName()), edits)
				) {
					summaries.add(`TODO: ${named.getName()}`);
					operations += 1;
				}
			}
		}
		for (const declaration of sourceFile.getExportDeclarations()) {
			const specifier = declaration.getModuleSpecifierValue();
			const node = declaration.getModuleSpecifier();
			if (specifier && node && OLD_ENTRIES.has(specifier)) {
				const quote = node.getText().charAt(0);
				edits.push(toTextEdit(node, `${quote}${entry}${quote}`));
				summaries.add(`${specifier} -> ${entry}`);
				operations += 1;
			}
		}
		for (const call of sourceFile.getDescendantsOfKind(
			SyntaxKind.CallExpression
		)) {
			const [argument] = call.getArguments();
			if (
				call.getExpression().getKind() === SyntaxKind.ImportKeyword &&
				argument &&
				Node.isStringLiteral(argument) &&
				OLD_ENTRIES.has(argument.getLiteralText())
			) {
				const quote = argument.getText().charAt(0);
				edits.push(toTextEdit(argument, `${quote}${entry}${quote}`));
				summaries.add(`${argument.getLiteralText()} -> ${entry}`);
				operations += 1;
			}
		}
		if (edits.length === 0) {
			return UNCHANGED;
		}
		applyEdits(sourceFile, edits);
		return { changed: true, operations, summaries: [...summaries] };
	};

/**
 * Points `@c15t/dev-tools/react` and `@c15t/dev-tools/tanstack` imports at
 * the framework's `/devtools` entry, `c15t/next/devtools` in a Next.js app
 * and `c15t/react/devtools` otherwise, and removes the `namespace` prop v3
 * dropped. Removed store helpers get a `TODO(c15t v3)` comment.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runDevToolsToC15tCodemod = async function runDevToolsToC15tCodemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	let manifest: DependencyMap | null = null;
	try {
		manifest = JSON.parse(
			await readFile(join(options.projectRoot, 'package.json'), 'utf-8')
		) as DependencyMap;
	} catch {
		manifest = null;
	}
	return runTransform(options, transformWith(devtoolsEntryFor(manifest)));
};
