import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	applyEdits,
	moveSpecifiers,
	referencesOf,
	renamedSpecifierText,
	toTextEdit,
	UNCHANGED,
} from './source-edits';
import type { SpecifierMove, TextEdit, TransformResult } from './source-edits';

/**
 * v2 entries that exported `policyPackPresets`, and the v3 entry that
 * exports `policyRulePresets` for the same install. The React and Next.js
 * entries no longer export presets.
 */
const PRESET_ENTRIES: Record<string, string> = {
	'@c15t/backend': '@c15t/backend',
	'@c15t/nextjs': '@c15t/core',
	'@c15t/nextjs/headless': '@c15t/core',
	'@c15t/react': '@c15t/core',
	'@c15t/react/headless': '@c15t/core',
	'@c15t/schema': '@c15t/schema',
	'@c15t/schema/types': '@c15t/schema/types',
	c15t: 'c15t',
	'c15t/next': 'c15t',
	'c15t/next/headless': 'c15t',
	'c15t/react': 'c15t',
	'c15t/react/headless': 'c15t',
};

const RENAMES: Record<string, string> = {
	PolicyPackPresets: 'PolicyRulePresets',
	policyPackPresets: 'policyRulePresets',
};

const METHOD_RENAMES: Record<string, string> = { worldNoBanner: 'worldNone' };

/** Rewrites `presets.worldNoBanner` and `const { worldNoBanner } = presets`. */
const planMethodRenames = function planMethodRenames(
	references: TsMorphTypes.Node[],
	edits: TextEdit[]
): number {
	let operations = 0;
	for (const reference of references) {
		const parent = reference.getParent();
		if (
			Node.isPropertyAccessExpression(parent) &&
			parent.getExpression() === reference
		) {
			const next = METHOD_RENAMES[parent.getName()];
			if (next) {
				edits.push(toTextEdit(parent.getNameNode(), next));
				operations += 1;
			}
			continue;
		}
		if (
			Node.isVariableDeclaration(parent) &&
			parent.getInitializer() === reference
		) {
			const pattern = parent.getNameNode();
			if (!Node.isObjectBindingPattern(pattern)) {
				continue;
			}
			for (const element of pattern.getElements()) {
				const key = (
					element.getPropertyNameNode() ?? element.getNameNode()
				).getText();
				const next = METHOD_RENAMES[key];
				if (!next) {
					continue;
				}
				edits.push(
					toTextEdit(
						element,
						element.getPropertyNameNode()
							? element.getText().replace(key, next)
							: `${next}: ${key}`
					)
				);
				operations += 1;
			}
		}
	}
	return operations;
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TransformResult {
	const edits: TextEdit[] = [];
	const summaries: string[] = [];
	let operations = 0;
	for (const declaration of sourceFile.getImportDeclarations()) {
		const entry = declaration.getModuleSpecifierValue();
		const target = PRESET_ENTRIES[entry];
		if (!target) {
			continue;
		}
		const moves = new Map<TsMorphTypes.Node, SpecifierMove>();
		for (const named of declaration.getNamedImports()) {
			const next = RENAMES[named.getName()];
			if (!next) {
				continue;
			}
			const references = referencesOf(named);
			if (!named.getAliasNode()) {
				for (const reference of references) {
					edits.push(toTextEdit(reference, next));
				}
			}
			const methods = planMethodRenames(references, edits);
			operations += 1 + methods;
			summaries.push(`${named.getName()} -> ${next}`);
			if (methods > 0) {
				summaries.push('worldNoBanner -> worldNone');
			}
			if (target === entry) {
				edits.push(toTextEdit(named.getNameNode(), next));
			} else {
				moves.set(named, {
					target,
					text: renamedSpecifierText(named, next, false),
				});
			}
		}
		moveSpecifiers(declaration, moves, edits);
	}
	// `import * as c15t from 'c15t'` then `c15t.policyPackPresets.worldNoBanner()`.
	for (const access of sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAccessExpression
	)) {
		const next = RENAMES[access.getName()];
		const namespace = access.getExpression();
		if (!next || !Node.isIdentifier(namespace)) {
			continue;
		}
		const entry = namespace
			.getSymbol()
			?.getDeclarations()
			.find((declaration) => Node.isNamespaceImport(declaration))
			?.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)
			?.getModuleSpecifierValue();
		if (!entry || PRESET_ENTRIES[entry] !== entry) {
			continue;
		}
		edits.push(toTextEdit(access.getNameNode(), next));
		const methods = planMethodRenames([access], edits);
		operations += 1 + methods;
		summaries.push(`${access.getName()} -> ${next}`);
		if (methods > 0) {
			summaries.push('worldNoBanner -> worldNone');
		}
	}
	if (edits.length === 0) {
		return UNCHANGED;
	}
	applyEdits(sourceFile, edits);
	return { changed: true, operations, summaries: [...new Set(summaries)] };
};

/**
 * Renames `policyPackPresets` to `policyRulePresets` and `worldNoBanner()`
 * to `worldNone()`. Imports from React and Next.js entries move to the
 * headless engine entry, which is the only client entry that exports them
 * in v3.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runPolicyPacksToPolicyRulesCodemod =
	function runPolicyPacksToPolicyRulesCodemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		return runTransform(options, transformSourceFile);
	};
