import { extname, join } from 'node:path';

import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import {
	declaresTailwind3,
	dependenciesOf,
	readPackageJson,
	tailwindMajor,
	usesUmbrella,
} from './manifest';
import { mergeResults, runTextTransform, runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	addTodo,
	applyEdits,
	elementRemovals,
	TODO_MARKER,
	UNCHANGED,
} from './source-edits';
import type { TextEdit, TransformResult } from './source-edits';
import { findStylesheetImports } from './stylesheet-imports';
import type { StylesheetImport } from './stylesheet-imports';

const STYLESHEET_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less']);

/** `@c15t/react` subpaths that `c15t/react` serves under the same name. */
const REACT_SUBPATHS = new Set([
	'components/consent-banner',
	'components/consent-dialog',
	'components/consent-dialog-link',
	'components/consent-dialog-trigger',
	'components/consent-gate',
	'components/consent-widget',
	'components/frame',
	'consent-banner',
	'consent-dialog',
	'consent-dialog-link',
	'consent-dialog-trigger',
	'consent-gate',
	'consent-widget',
	'context',
	'devtools',
	'draft',
	'frame',
	'gpp',
	'headless',
	'hooks',
	'iab',
	'iab/styles.css',
	'iab/styles.tw3.css',
	'module-hooks',
	'module-hooks/iframe-blocker',
	'module-hooks/network-blocker',
	'module-hooks/persistence',
	'module-hooks/script-loader',
	'primitives',
	'provider',
	'server',
	'styles.css',
	'styles.tw3.css',
	'types',
	'utils',
]);

/** `@c15t/nextjs` subpaths that `c15t/next` serves under the same name. */
const NEXT_SUBPATHS = new Set([
	'api',
	'build',
	'components/consent-dialog-link',
	'devtools',
	'headless',
	'iab/styles.css',
	'iab/styles.tw3.css',
	'middleware',
	'pages',
	'proxy',
	'server',
	'static',
	'styles.css',
	'styles.tw3.css',
]);

/** v2 subpaths that point at a different v3 entry. */
const RENAMED_REACT_SUBPATHS: Record<string, string> = {
	'cookie-banner': 'c15t/react/components/consent-banner',
	'postcss-tailwind3': 'c15t/postcss-tailwind3',
};

const SCOPED_SPECIFIER = /^@c15t\/(?<pkg>react|nextjs)(?:\/(?<subpath>.+))?$/u;
const POSTCSS_PLUGIN_SPECIFIER =
	/^@c15t\/(?:react|nextjs)\/postcss-tailwind3$/u;
const STYLESHEET_SPECIFIER =
	/^@c15t\/(?<pkg>react|nextjs)\/(?<iab>iab\/)?styles(?<tw3>\.tw3)?\.css$/u;
const KEPT_SUMMARY = ', kept with a TODO';

const ESM_TODO =
	'c15t ships ESM only from v3. require() loads it only on Node.js 20.19+ or 22.12+. Convert this file to import, or to an .mjs or ESM config, to support older runtimes.';

const STYLES_TODO =
	'c15t components add their own styles. Keep this import only with Tailwind CSS 3 or a named cascade layer, and set styles: false in the provider options.';

/** What the app's package.json says about how to import c15t. */
interface ImportPlan {
	/** Import from the `c15t` umbrella entries instead of the scoped packages. */
	umbrella: boolean;
	/** The app runs on Next.js, so `@c15t/react` maps to `c15t/next`. */
	next: boolean;
	/**
	 * The app may use Tailwind CSS 3, which needs the stylesheet import: a
	 * dependency group declares Tailwind CSS 3 (a peer range that allows it
	 * counts), or the codemod can't resolve the version.
	 */
	tailwind3: boolean;
}

/** Where a scoped import goes in v3, or a TODO when v3 has no such entry. */
type SpecifierTarget = { specifier: string } | { todo: string };

const targetOf = function targetOf(
	specifier: string,
	plan: ImportPlan
): SpecifierTarget | null {
	const match = SCOPED_SPECIFIER.exec(specifier);
	if (!match?.groups) {
		return null;
	}
	const { pkg, subpath } = match.groups;
	if (subpath === undefined) {
		return {
			specifier: pkg === 'react' && !plan.next ? 'c15t/react' : 'c15t/next',
		};
	}
	if (subpath === 'components/integrations') {
		return {
			todo: `${specifier} was removed. GoogleMap and YouTubeEmbed are gone; wrap your own embed in ConsentGate.`,
		};
	}
	if (pkg === 'react') {
		if (REACT_SUBPATHS.has(subpath) || subpath.startsWith('primitives/')) {
			return { specifier: `c15t/react/${subpath}` };
		}
		const renamed = RENAMED_REACT_SUBPATHS[subpath];
		if (renamed) {
			return { specifier: renamed };
		}
	} else if (NEXT_SUBPATHS.has(subpath)) {
		return { specifier: `c15t/next/${subpath}` };
	} else if (subpath === 'postcss-tailwind3') {
		return { specifier: 'c15t/postcss-tailwind3' };
	}
	return {
		todo: `${specifier} is not a c15t v3 entry. Import from c15t/${pkg === 'react' ? 'react' : 'next'} or one of its subpaths.`,
	};
};

/**
 * Where a stylesheet import goes when the app still needs it: `styles.css`,
 * because v3 dropped the Tailwind CSS 3 variant, from the entry the app
 * imports c15t through.
 */
const keptStylesheet = function keptStylesheet(
	specifier: string,
	umbrella: boolean
): string {
	const groups = STYLESHEET_SPECIFIER.exec(specifier)?.groups ?? {};
	const pkg = groups.pkg ?? 'react';
	const base = umbrella
		? `c15t/${pkg === 'nextjs' ? 'next' : 'react'}`
		: `@c15t/${pkg}`;
	return `${base}/${groups.iab ?? ''}styles.css`;
};

/** Whether a stylesheet import must stay, with a TODO, rather than go. */
const keepsStylesheet = function keepsStylesheet(
	specifier: string,
	plan: ImportPlan
): boolean {
	return (
		plan.tailwind3 ||
		STYLESHEET_SPECIFIER.exec(specifier)?.groups?.tw3 !== undefined
	);
};

/** Whether a literal names the scoped PostCSS plugin as an object-form `plugins` key. */
const isPostcssPluginKey = function isPostcssPluginKey(
	literal: TsMorphTypes.StringLiteral,
	parent: TsMorphTypes.Node | undefined
): boolean {
	return (
		POSTCSS_PLUGIN_SPECIFIER.test(literal.getLiteralValue()) &&
		Node.isPropertyAssignment(parent) &&
		parent.getNameNode() === literal
	);
};

/** Whether a call is `require(...)`. */
const isRequireCall = function isRequireCall(
	call: TsMorphTypes.CallExpression
): boolean {
	const callee = call.getExpression();
	return Node.isIdentifier(callee) && callee.getText() === 'require';
};

/**
 * Test-runner and `require` helpers whose first argument names a module, so
 * a mock of `@c15t/react` follows the import it replaces.
 */
const MODULE_HELPERS = new Set([
	'jest.createMockFromModule',
	'jest.doMock',
	'jest.dontMock',
	'jest.mock',
	'jest.requireActual',
	'jest.requireMock',
	'jest.setMock',
	'jest.unmock',
	'require.resolve',
	'vi.doMock',
	'vi.doUnmock',
	'vi.importActual',
	'vi.importMock',
	'vi.mock',
	'vi.unmock',
]);

/** Whether a node is a `vi.mock()`-style call from {@link MODULE_HELPERS}. */
const isModuleHelperCall = function isModuleHelperCall(
	node: TsMorphTypes.Node
): boolean {
	if (!Node.isCallExpression(node)) {
		return false;
	}
	const callee = node.getExpression();
	return (
		Node.isPropertyAccessExpression(callee) &&
		MODULE_HELPERS.has(callee.getText())
	);
};

/** Whether a call's first argument is a module specifier. */
const takesModuleSpecifier = function takesModuleSpecifier(
	call: TsMorphTypes.CallExpression
): boolean {
	return (
		call.getExpression().getKind() === SyntaxKind.ImportKeyword ||
		isRequireCall(call) ||
		isModuleHelperCall(call)
	);
};

/**
 * Where a mock of a stylesheet points: the path its import is kept at, or
 * `undefined` when the import is removed and the mock has nothing to follow.
 */
const stylesheetMockTarget = function stylesheetMockTarget(
	specifier: string,
	plan: ImportPlan
): string | undefined {
	if (!keepsStylesheet(specifier, plan)) {
		return undefined;
	}
	const kept = keptStylesheet(specifier, plan.umbrella);
	return kept === specifier ? undefined : kept;
};

/**
 * The string literals that name a module: imports, re-exports,
 * `import x = require()`, `import()` and `require()` calls, `vi.mock()` and
 * `jest.mock()` calls, import types (JSDoc ones too), and PostCSS plugin
 * keys. A template literal or computed argument is left alone.
 */
const moduleSpecifiersOf = function moduleSpecifiersOf(
	sourceFile: TsMorphTypes.SourceFile
): TsMorphTypes.StringLiteral[] {
	return sourceFile
		.getDescendantsOfKind(SyntaxKind.StringLiteral)
		.filter((literal) => {
			const parent = literal.getParent();
			if (isPostcssPluginKey(literal, parent)) {
				return true;
			}
			if (
				Node.isImportDeclaration(parent) ||
				Node.isExportDeclaration(parent)
			) {
				return parent.getModuleSpecifier() === literal;
			}
			if (Node.isExternalModuleReference(parent)) {
				return true;
			}
			if (Node.isCallExpression(parent)) {
				return (
					parent.getArguments()[0] === literal && takesModuleSpecifier(parent)
				);
			}
			return (
				Node.isLiteralTypeNode(parent) &&
				Node.isImportTypeNode(parent.getParent())
			);
		});
};

/**
 * Whether a specifier is loaded through `require()` at runtime: a
 * `require()` call or a TypeScript `import x = require()`. `require.resolve`,
 * `import()` and the test-runner helpers are left out.
 */
const loadsWithRequire = function loadsWithRequire(
	parent: TsMorphTypes.Node
): boolean {
	return (
		Node.isExternalModuleReference(parent) ||
		(Node.isCallExpression(parent) && isRequireCall(parent))
	);
};

/**
 * Where a TODO about a module specifier goes: above a JSDoc comment that
 * holds it, since a block comment can't go inside one, or above the
 * statement that holds it when that statement starts on the same line, so
 * `const x = require(…)` gets its TODO on the line above rather than inside
 * the expression.
 */
const todoAnchor = function todoAnchor(
	parent: TsMorphTypes.Node
): TsMorphTypes.Node {
	if (Node.isImportDeclaration(parent) || Node.isExportDeclaration(parent)) {
		return parent;
	}
	const jsDoc = parent.getFirstAncestor(Node.isJSDoc);
	if (jsDoc) {
		return jsDoc;
	}
	const statement = parent.getFirstAncestor(Node.isStatement);
	return statement &&
		statement.getStartLineNumber() === parent.getStartLineNumber()
		? statement
		: parent;
};

/**
 * The statement a stylesheet import is alone in, which removing the import
 * removes: `import './styles.css';` or `require('./styles.css');`.
 */
const sideEffectStatement = function sideEffectStatement(
	parent: TsMorphTypes.Node
): TsMorphTypes.Node | undefined {
	if (Node.isImportDeclaration(parent)) {
		return parent.getImportClause() === undefined ? parent : undefined;
	}
	const statement = parent.getParent();
	return Node.isCallExpression(parent) &&
		isRequireCall(parent) &&
		Node.isExpressionStatement(statement)
		? statement
		: undefined;
};

/** Replaces the text between a string literal's quotes, keeping its quote style. */
const rewriteLiteral = function rewriteLiteral(
	literal: TsMorphTypes.StringLiteral,
	text: string
): TextEdit {
	return { end: literal.getEnd() - 1, start: literal.getStart() + 1, text };
};

/** What the source transform reports beyond its edits. */
interface TransformHooks {
	/** An import was left alone because the app doesn't install c15t 3. */
	onScopedImport: () => void;
	/** A file has `require()` calls that now name an ESM-only c15t entry. */
	onRequires: (filePath: string, count: number) => void;
}

const transformWith = (
	plan: ImportPlan,
	hooks: TransformHooks
): ((sourceFile: TsMorphTypes.SourceFile) => TransformResult) =>
	function transform(sourceFile) {
		const edits: TextEdit[] = [];
		// Removed together, so two on one line don't both claim the space
		// between them.
		const removed: TsMorphTypes.Node[] = [];
		const summaries = new Set<string>();
		let operations = 0;
		let requires = 0;

		for (const literal of moduleSpecifiersOf(sourceFile)) {
			const specifier = literal.getLiteralValue();
			const parent = literal.getParentOrThrow();
			if (STYLESHEET_SPECIFIER.test(specifier) && isModuleHelperCall(parent)) {
				const target = stylesheetMockTarget(specifier, plan);
				if (target !== undefined) {
					edits.push(rewriteLiteral(literal, target));
					summaries.add(`${specifier} -> ${target}`);
					operations += 1;
				}
				continue;
			}
			if (STYLESHEET_SPECIFIER.test(specifier)) {
				const sideEffect = sideEffectStatement(parent);
				if (sideEffect && !keepsStylesheet(specifier, plan)) {
					removed.push(sideEffect);
					summaries.add(`removed ${specifier}`);
					operations += 1;
					continue;
				}
				const kept = keptStylesheet(specifier, plan.umbrella);
				const todo = addTodo(todoAnchor(parent), STYLES_TODO, edits);
				if (kept !== specifier) {
					edits.push(rewriteLiteral(literal, kept));
				}
				if (todo || kept !== specifier) {
					summaries.add(`${specifier} -> ${kept}${KEPT_SUMMARY}`);
					operations += 1;
				}
				continue;
			}
			const target = targetOf(specifier, plan);
			if (target === null) {
				continue;
			}
			if (!plan.umbrella) {
				hooks.onScopedImport();
				continue;
			}
			if ('todo' in target) {
				if (addTodo(todoAnchor(parent), target.todo, edits)) {
					summaries.add(`TODO: ${specifier}`);
					operations += 1;
				}
				continue;
			}
			edits.push(rewriteLiteral(literal, target.specifier));
			summaries.add(`${specifier} -> ${target.specifier}`);
			operations += 1;
			if (loadsWithRequire(parent)) {
				addTodo(todoAnchor(parent), ESM_TODO, edits);
				requires += 1;
			}
		}

		edits.push(...elementRemovals(removed));
		if (requires > 0) {
			hooks.onRequires(sourceFile.getFilePath(), requires);
		}
		if (edits.length === 0) {
			return UNCHANGED;
		}
		applyEdits(sourceFile, edits);
		return { changed: true, operations, summaries: [...summaries] };
	};

/** The start of the line that holds `index`. */
const lineStartOf = function lineStartOf(text: string, index: number): number {
	return text.lastIndexOf('\n', index - 1) + 1;
};

/**
 * The range that removes a stylesheet directive and its trailing comments:
 * its whole line when nothing else is on it, or just the directive when a
 * rule follows it. With nothing after it, the space before it goes instead.
 */
const directiveRemoval = function directiveRemoval(
	text: string,
	directive: StylesheetImport,
	lineStart: number
): TextEdit {
	const before = text.slice(lineStart, directive.start);
	if (directive.followed) {
		return { end: directive.trailingEnd, start: directive.start, text: '' };
	}
	if (before.trim() === '') {
		const newline = /^\r?\n/u.exec(text.slice(directive.trailingEnd));
		return {
			end: directive.trailingEnd + (newline?.[0].length ?? 0),
			start: lineStart,
			text: '',
		};
	}
	const leading = /[\t ]*$/u.exec(before)?.[0].length ?? 0;
	return {
		end: directive.trailingEnd,
		start: directive.start - leading,
		text: '',
	};
};

/**
 * Removes or keeps c15t stylesheet `@import` directives. Each directive is
 * read whole, so one that spans lines or takes Less options is handled like
 * any other. A directive without a `;` that shares its line with more than a
 * comment is left alone, as the codemod can't tell where it ends.
 */
const transformStylesheet = function transformStylesheet(
	text: string,
	filePath: string,
	plan: ImportPlan
): { text: string; operations: number; summaries: string[] } {
	const edits: TextEdit[] = [];
	const summaries = new Set<string>();
	let operations = 0;
	for (const directive of findStylesheetImports(text, extname(filePath))) {
		const { specifier } = directive;
		if (!(STYLESHEET_SPECIFIER.test(specifier) && directive.bounded)) {
			continue;
		}
		const lineStart = lineStartOf(text, directive.start);
		const before = text.slice(lineStart, directive.start);
		const startsLine = before.trim() === '';
		// A layer(), supports() or media query places the import on purpose.
		if (!(directive.placed || keepsStylesheet(specifier, plan))) {
			edits.push(directiveRemoval(text, directive, lineStart));
			summaries.add(`removed ${specifier}`);
			operations += 1;
			continue;
		}
		const kept = keptStylesheet(specifier, plan.umbrella);
		const comment = `/* ${TODO_MARKER} ${STYLES_TODO} */`;
		const previousLine = text.slice(
			lineStartOf(text, Math.max(0, lineStart - 1)),
			lineStart
		);
		const todo = startsLine
			? !(lineStart > 0 && previousLine.includes(TODO_MARKER))
			: !before.includes(TODO_MARKER);
		if (todo) {
			edits.push(
				startsLine
					? { end: lineStart, start: lineStart, text: `${before}${comment}\n` }
					: {
							end: directive.start,
							start: directive.start,
							text: `${comment} `,
						}
			);
		}
		if (kept !== specifier) {
			edits.push({
				end: directive.specifierEnd,
				start: directive.specifierStart,
				text: kept,
			});
		}
		if (todo || kept !== specifier) {
			summaries.add(`${specifier} -> ${kept}${KEPT_SUMMARY}`);
			operations += 1;
		}
	}
	let output = text;
	// Edits never overlap, so applying them from the end keeps offsets valid.
	const ordered = [...edits].sort((left, right) => right.start - left.start);
	for (const edit of ordered) {
		output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
	}
	return { operations, summaries: [...summaries], text: output };
};

/**
 * Points `@c15t/react` and `@c15t/nextjs` imports at the `c15t` entries
 * that replace them in v3: `c15t/react` and its subpaths, or `c15t/next` in
 * a Next.js app, and the scoped `postcss-tailwind3` plugins at
 * `c15t/postcss-tailwind3`. Removes `styles.css` imports, because v3
 * components add their own styles, and keeps them with a `TODO(c15t v3)`
 * comment where Tailwind CSS 3 or a cascade layer still needs them, or where
 * the Tailwind CSS version can't be resolved. An app whose package.json lists
 * the scoped packages without `c15t` 3 keeps its scoped imports.
 * package.json itself is left alone.
 *
 * @param options - Codemod execution options.
 * @returns Changed files, non-fatal per-file errors and skipped imports.
 */
export const runPackagesToC15tCodemod = async function runPackagesToC15tCodemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	const manifest = await readPackageJson(options.projectRoot);
	const dependencies = dependenciesOf(manifest);
	const tailwind = dependencies.tailwindcss;
	const major =
		tailwind === undefined
			? undefined
			: await tailwindMajor(options.projectRoot, tailwind);
	const plan: ImportPlan = {
		next:
			dependencies.next !== undefined ||
			dependencies['@c15t/nextjs'] !== undefined,
		// Keeping an import the app doesn't need costs a TODO; removing one
		// Tailwind CSS 3 needs breaks the styling.
		tailwind3: major === 3 || major === null || declaresTailwind3(manifest),
		umbrella: usesUmbrella(dependencies),
	};
	let skippedScopedImports = false;
	const requireWarnings: { filePath: string; message: string }[] = [];
	const sources = await runTransform(
		options,
		transformWith(plan, {
			onRequires: (filePath, count) => {
				requireWarnings.push({
					filePath,
					message: `${count} require() ${count === 1 ? 'call names' : 'calls name'} c15t, which ships ESM only from v3. require() loads it only on Node.js 20.19+ or 22.12+. Convert the file to import, or to an .mjs or ESM config, to support older runtimes.`,
				});
			},
			onScopedImport: () => {
				skippedScopedImports = true;
			},
		})
	);
	const stylesheets = await runTextTransform(
		options,
		STYLESHEET_EXTENSIONS,
		(text, filePath) => transformStylesheet(text, filePath, plan)
	);
	const result = mergeResults(sources, stylesheets);
	if (requireWarnings.length > 0) {
		result.warnings = [...(result.warnings ?? []), ...requireWarnings];
	}
	const keptStylesheets = result.changedFiles.some((file) =>
		file.summaries.some((summary) => summary.endsWith(KEPT_SUMMARY))
	);
	if (major === null && keptStylesheets) {
		result.warnings = [
			...(result.warnings ?? []),
			{
				filePath: join(options.projectRoot, 'package.json'),
				message: `Could not tell the Tailwind CSS version from '${tailwind}', so c15t stylesheet imports were kept with a TODO. Remove them if the app uses Tailwind CSS 4 or none.`,
			},
		];
	}
	if (skippedScopedImports) {
		const listed = ['@c15t/react', '@c15t/nextjs']
			.filter((name) => dependencies[name] !== undefined)
			.join(' and ');
		result.warnings = [
			...(result.warnings ?? []),
			{
				filePath: join(options.projectRoot, 'package.json'),
				message: `package.json lists ${listed} without c15t 3, so their imports were left as they are. Replace them with c15t@alpha and run packages-to-c15t again to point them at c15t/react or c15t/next.`,
			},
		];
	}
	return result;
};
