import { join } from 'node:path';

import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import {
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
	propertyRemoval,
	TODO_MARKER,
	UNCHANGED,
} from './source-edits';
import type { TextEdit, TransformResult } from './source-edits';

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
const CSS_IMPORT =
	/^(?<indent>[\t ]*)@import\s+(?:url\(\s*)?(?<quote>['"])(?<specifier>@c15t\/(?:react|nextjs)\/(?:iab\/)?styles(?:\.tw3)?\.css)\k<quote>(?:\s*\))?(?<conditions>[^;]*?);?(?:\s*\/\*.*?\*\/)*\s*$/u;

const KEPT_SUMMARY = ', kept with a TODO';

const STYLES_TODO =
	'c15t components add their own styles. Keep this import only with Tailwind CSS 3 or a named cascade layer, and set styles: false in the provider options.';

/** What the app's package.json says about how to import c15t. */
interface ImportPlan {
	/** Import from the `c15t` umbrella entries instead of the scoped packages. */
	umbrella: boolean;
	/** The app runs on Next.js, so `@c15t/react` maps to `c15t/next`. */
	next: boolean;
	/**
	 * The app may use Tailwind CSS 3, which needs the stylesheet import: it
	 * declares Tailwind CSS 3, or a version the codemod can't resolve.
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

/**
 * Whether a literal names the scoped PostCSS plugin the way a PostCSS config
 * loads it: as an object-form `plugins` key or through `require()`.
 */
const isPostcssPluginReference = function isPostcssPluginReference(
	literal: TsMorphTypes.StringLiteral,
	parent: TsMorphTypes.Node | undefined
): boolean {
	if (!POSTCSS_PLUGIN_SPECIFIER.test(literal.getLiteralValue())) {
		return false;
	}
	if (Node.isPropertyAssignment(parent)) {
		return parent.getNameNode() === literal;
	}
	return (
		Node.isCallExpression(parent) &&
		parent.getExpression().getText() === 'require' &&
		parent.getArguments()[0] === literal
	);
};

/**
 * The string literals that name a module: imports, re-exports, `import()`,
 * import types, and PostCSS plugin keys and `require()` calls.
 */
const moduleSpecifiersOf = function moduleSpecifiersOf(
	sourceFile: TsMorphTypes.SourceFile
): TsMorphTypes.StringLiteral[] {
	return sourceFile
		.getDescendantsOfKind(SyntaxKind.StringLiteral)
		.filter((literal) => {
			const parent = literal.getParent();
			if (isPostcssPluginReference(literal, parent)) {
				return true;
			}
			if (
				Node.isImportDeclaration(parent) ||
				Node.isExportDeclaration(parent)
			) {
				return parent.getModuleSpecifier() === literal;
			}
			if (Node.isCallExpression(parent)) {
				return (
					parent.getExpression().getKind() === SyntaxKind.ImportKeyword &&
					parent.getArguments()[0] === literal
				);
			}
			return (
				Node.isLiteralTypeNode(parent) &&
				Node.isImportTypeNode(parent.getParent())
			);
		});
};

/** Replaces the text between a string literal's quotes, keeping its quote style. */
const rewriteLiteral = function rewriteLiteral(
	literal: TsMorphTypes.StringLiteral,
	text: string
): TextEdit {
	return { end: literal.getEnd() - 1, start: literal.getStart() + 1, text };
};

const transformWith = (
	plan: ImportPlan,
	onScopedImport: () => void
): ((sourceFile: TsMorphTypes.SourceFile) => TransformResult) =>
	function transform(sourceFile) {
		const edits: TextEdit[] = [];
		const summaries = new Set<string>();
		let operations = 0;

		for (const literal of moduleSpecifiersOf(sourceFile)) {
			const specifier = literal.getLiteralValue();
			const parent = literal.getParentOrThrow();
			if (STYLESHEET_SPECIFIER.test(specifier)) {
				const sideEffect =
					Node.isImportDeclaration(parent) &&
					parent.getImportClause() === undefined;
				if (sideEffect && !keepsStylesheet(specifier, plan)) {
					edits.push(propertyRemoval(parent));
					summaries.add(`removed ${specifier}`);
					operations += 1;
					continue;
				}
				const kept = keptStylesheet(specifier, plan.umbrella);
				const todo = addTodo(parent, STYLES_TODO, edits);
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
				onScopedImport();
				continue;
			}
			if ('todo' in target) {
				if (addTodo(parent, target.todo, edits)) {
					summaries.add(`TODO: ${specifier}`);
					operations += 1;
				}
				continue;
			}
			edits.push(rewriteLiteral(literal, target.specifier));
			summaries.add(`${specifier} -> ${target.specifier}`);
			operations += 1;
		}

		if (edits.length === 0) {
			return UNCHANGED;
		}
		applyEdits(sourceFile, edits);
		return { changed: true, operations, summaries: [...summaries] };
	};

/** Removes or keeps stylesheet `@import`s, one line at a time. */
const transformStylesheet = function transformStylesheet(
	text: string,
	plan: ImportPlan
): { text: string; operations: number; summaries: string[] } {
	const lines: string[] = [];
	const summaries = new Set<string>();
	let operations = 0;
	for (const line of text.split('\n')) {
		const groups = CSS_IMPORT.exec(line)?.groups;
		if (!groups) {
			lines.push(line);
			continue;
		}
		const specifier = groups.specifier ?? '';
		// A layer(), supports() or media query places the import on purpose.
		const placed = (groups.conditions ?? '').trim() !== '';
		if (!(placed || keepsStylesheet(specifier, plan))) {
			summaries.add(`removed ${specifier}`);
			operations += 1;
			continue;
		}
		const kept = keptStylesheet(specifier, plan.umbrella);
		const todo = !lines.at(-1)?.includes(TODO_MARKER);
		if (todo) {
			lines.push(`${groups.indent ?? ''}/* ${TODO_MARKER} ${STYLES_TODO} */`);
		}
		lines.push(line.replace(specifier, kept));
		if (todo || kept !== specifier) {
			summaries.add(`${specifier} -> ${kept}${KEPT_SUMMARY}`);
			operations += 1;
		}
	}
	return { operations, summaries: [...summaries], text: lines.join('\n') };
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
	const dependencies = dependenciesOf(
		await readPackageJson(options.projectRoot)
	);
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
		tailwind3: major === 3 || major === null,
		umbrella: usesUmbrella(dependencies),
	};
	let skippedScopedImports = false;
	const sources = await runTransform(
		options,
		transformWith(plan, () => {
			skippedScopedImports = true;
		})
	);
	const stylesheets = await runTextTransform(
		options,
		STYLESHEET_EXTENSIONS,
		(text) => transformStylesheet(text, plan)
	);
	const result = mergeResults(sources, stylesheets);
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
