import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { mergeResults, runTextTransform, runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	addTodo,
	applyEdits,
	TODO_MARKER,
	toTextEdit,
	UNCHANGED,
} from './source-edits';
import type { TextEdit, TransformResult } from './source-edits';

const STYLESHEET_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less']);

/** Every `--consent-widget-*` suffix v2 read; each has a `--consent-manager-*` twin in v3. */
const WIDGET_SUFFIXES = [
	'background-color',
	'background-color-dark',
	'border-color',
	'border-color-dark',
	'border-width',
	'branding-link-color',
	'entry-animation',
	'exit-animation',
	'font-family',
	'footer-background-color',
	'footer-background-color-dark',
	'footer-padding',
	'gap',
	'line-height',
	'link-text-color',
	'link-text-color-dark',
	'max-width',
	'padding',
	'radius',
	'text-color',
	'text-color-dark',
	'text-muted-color',
	'text-muted-color-dark',
	'title-line-height',
	'title-size',
	'title-tracking',
	'title-weight',
	'z-index',
];

/** Every `--frame-*` suffix v2 read; each has a `--consent-gate-*` twin in v3. */
const FRAME_SUFFIXES = [
	'font-family',
	'line-height',
	'placeholder-animation',
	'placeholder-background-color',
	'placeholder-background-color-dark',
	'placeholder-border-color',
	'placeholder-border-color-dark',
	'placeholder-border-radius',
	'placeholder-border-width',
	'placeholder-gap',
	'placeholder-opacity',
	'placeholder-shadow',
	'placeholder-shadow-dark',
	'placeholder-text-color',
	'placeholder-text-color-dark',
	'placeholder-title-color',
	'placeholder-title-color-dark',
];

const alternation = (suffixes: string[]) =>
	[...suffixes].sort((left, right) => right.length - left.length).join('|');

// Only c15t's own suffixes, so an app's own `--frame-*` variables stay put.
const WIDGET_PATTERN = new RegExp(
	`(?<![\\w-])--consent-widget-(${alternation(WIDGET_SUFFIXES)})(?![\\w-])`,
	'gu'
);
const FRAME_PATTERN = new RegExp(
	`(?<![\\w-])--frame-(${alternation(FRAME_SUFFIXES)})(?![\\w-])`,
	'gu'
);
const ACCORDION_PATTERN = /(?<![\w-])--consent-widget-accordion-[\w-]+/u;

const ACCORDION_TODO =
	'--consent-widget-accordion-* was removed. Set --accordion-* instead.';

interface Rewrite {
	text: string;
	operations: number;
	summaries: Set<string>;
}

const renameVariables = function renameVariables(text: string): Rewrite {
	const summaries = new Set<string>();
	let operations = 0;
	const renamed = text
		.replace(WIDGET_PATTERN, (_match, suffix: string) => {
			operations += 1;
			summaries.add('--consent-widget-* -> --consent-manager-*');
			return `--consent-manager-${suffix}`;
		})
		.replace(FRAME_PATTERN, (_match, suffix: string) => {
			operations += 1;
			summaries.add('--frame-* -> --consent-gate-*');
			return `--consent-gate-${suffix}`;
		});
	return { operations, summaries, text: renamed };
};

/** Renames variables in a stylesheet and marks accordion variables line by line. */
const transformStylesheet = function transformStylesheet(text: string) {
	const { text: renamed, operations, summaries } = renameVariables(text);
	const comment = `/* ${TODO_MARKER} ${ACCORDION_TODO} */`;
	const lines = renamed.split('\n');
	const output: string[] = [];
	let todos = 0;
	for (const [index, line] of lines.entries()) {
		// One comment above each run of accordion declarations.
		const previous = output.at(-1) ?? '';
		const continuesRun = ACCORDION_PATTERN.test(lines[index - 1] ?? '');
		if (
			ACCORDION_PATTERN.test(line) &&
			!continuesRun &&
			!previous.includes(comment)
		) {
			output.push(`${/^[\t ]*/u.exec(line)?.[0] ?? ''}${comment}`);
			todos += 1;
		}
		output.push(line);
	}
	if (todos > 0) {
		summaries.add('TODO: --consent-widget-accordion-*');
	}
	return {
		operations: operations + todos,
		summaries: [...summaries],
		text: output.join('\n'),
	};
};

/** The statement or object property a TODO about this literal belongs above. */
const todoAnchor = function todoAnchor(
	node: TsMorphTypes.Node
): TsMorphTypes.Node {
	return (
		node.getFirstAncestor(
			(ancestor) =>
				Node.isPropertyAssignment(ancestor) ||
				Node.isJsxAttribute(ancestor) ||
				Node.isStatement(ancestor)
		) ?? node
	);
};

/** Renames variables in string and template literals, including style object keys. */
const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TransformResult {
	if (!/--consent-widget-|--frame-/u.test(sourceFile.getFullText())) {
		return UNCHANGED;
	}
	const edits: TextEdit[] = [];
	const summaries = new Set<string>();
	let operations = 0;
	const literals = [
		...sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral),
		...sourceFile.getDescendantsOfKind(
			SyntaxKind.NoSubstitutionTemplateLiteral
		),
		...sourceFile.getDescendantsOfKind(SyntaxKind.TemplateHead),
		...sourceFile.getDescendantsOfKind(SyntaxKind.TemplateMiddle),
		...sourceFile.getDescendantsOfKind(SyntaxKind.TemplateTail),
	];
	const marked = new Set<number>();
	for (const literal of literals) {
		const raw = literal.getText();
		const rewrite = renameVariables(raw);
		if (rewrite.operations > 0) {
			edits.push(toTextEdit(literal, rewrite.text));
			operations += rewrite.operations;
			for (const summary of rewrite.summaries) {
				summaries.add(summary);
			}
		}
		if (ACCORDION_PATTERN.test(raw)) {
			const anchor = todoAnchor(literal);
			if (
				!marked.has(anchor.getStart()) &&
				addTodo(anchor, ACCORDION_TODO, edits)
			) {
				operations += 1;
				summaries.add('TODO: --consent-widget-accordion-*');
			}
			marked.add(anchor.getStart());
		}
	}
	if (edits.length === 0) {
		return UNCHANGED;
	}
	applyEdits(sourceFile, edits);
	return { changed: true, operations, summaries: [...summaries] };
};

/**
 * Renames `--consent-widget-*` to `--consent-manager-*` and `--frame-*` to
 * `--consent-gate-*` in stylesheets and in string literals of JavaScript
 * and TypeScript files. Removed `--consent-widget-accordion-*` variables
 * get a `TODO(c15t v3)` comment instead.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runCssVariablesToV3Codemod =
	async function runCssVariablesToV3Codemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		const stylesheets = await runTextTransform(
			options,
			STYLESHEET_EXTENSIONS,
			transformStylesheet
		);
		const sources = await runTransform(options, transformSourceFile);
		return mergeResults(sources, stylesheets);
	};
