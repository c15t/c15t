import { Node } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';

const C15T_REACT_PACKAGES = new Set(['@c15t/react', '@c15t/nextjs']);

const RENAME_MAP = {
	ConsentManagerDialog: 'ConsentDialog',
	ConsentManagerDialogProps: 'ConsentDialogProps',
	ConsentManagerWidget: 'ConsentWidget',
	ConsentManagerWidgetProps: 'ConsentWidgetProps',
	CookieBanner: 'ConsentBanner',
	CookieBannerProps: 'ConsentBannerProps',
} as const;

interface ComponentRenamesResult {
	changed: boolean;
	operations: number;
	summaries: string[];
}

const transformSourceFile = (
	sourceFile: TsMorphTypes.SourceFile
): ComponentRenamesResult => {
	let operations = 0;
	const summaries: string[] = [];
	for (const declaration of sourceFile.getImportDeclarations()) {
		if (!C15T_REACT_PACKAGES.has(declaration.getModuleSpecifierValue())) {
			continue;
		}
		for (const namedImport of declaration.getNamedImports()) {
			const oldName = namedImport.getName();
			const replacement = Object.entries(RENAME_MAP).find(
				([name]) => name === oldName
			)?.[1];
			if (!replacement) {
				continue;
			}
			if (namedImport.getAliasNode()) {
				namedImport.setName(replacement);
			} else {
				const collisions = sourceFile
					.getLocals()
					.some((symbol) => symbol.getName() === replacement);
				if (collisions) {
					namedImport.setAlias(oldName);
					namedImport.setName(replacement);
				} else {
					const nameNode = namedImport.getNameNode();
					if (!Node.isIdentifier(nameNode)) {
						continue;
					}
					nameNode.rename(replacement, { usePrefixAndSuffixText: true });
					namedImport.setName(replacement);
					namedImport.removeAlias();
				}
			}
			operations += 1;
			summaries.push(`${oldName} -> ${replacement}`);
		}
	}
	return { changed: operations > 0, operations, summaries };
};

/**
 * Runs a codemod that renames legacy React/Next.js component exports to v2 names.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export const runComponentRenamesCodemod = function runComponentRenamesCodemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	return runTransform(options, transformSourceFile);
};

export type { CodemodRunOptions, CodemodRunResult } from './runner';
