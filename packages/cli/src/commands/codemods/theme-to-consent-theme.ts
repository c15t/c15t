import { Node } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { findOptionsObjects } from './consent-provider-options';
import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	addTodo,
	applyEdits,
	findProperty,
	objectLiteralFor,
	propertyKey,
	propertyValueNode,
	toTextEdit,
	UNCHANGED,
	unwrapExpression,
} from './source-edits';
import type { TextEdit, TransformResult } from './source-edits';

/** Theme keys that generated CSS in v2. `consentActions` and `slots` still apply in v3. */
const TOKEN_KEYS = new Set([
	'colors',
	'dark',
	'motion',
	'radius',
	'shadows',
	'spacing',
	'typography',
]);

const THEME_TODO =
	'theme tokens no longer generate CSS. Render <ConsentTheme theme={...} /> with the same theme, or add generateThemeCSS(theme) output to your stylesheet. Keep theme here for consentActions and slots.';
const FRAME_SLOT_TODO =
	'theme.slots.frame was split into consentGate, consentGateTitle and consentGateButton.';

/** The theme object, also through defineTheme({ ... }), or `unknown` when it cannot be read. */
const objectOf = function objectOf(
	value: TsMorphTypes.Node | undefined
): TsMorphTypes.ObjectLiteralExpression | 'unknown' {
	const expression =
		value && !Node.isShorthandPropertyAssignment(value)
			? unwrapExpression(value)
			: value;
	if (expression && Node.isCallExpression(expression)) {
		return objectOf(expression.getArguments()[0]);
	}
	return objectLiteralFor(expression) ?? 'unknown';
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TransformResult {
	const edits: TextEdit[] = [];
	const summaries = new Set<string>();
	let operations = 0;
	for (const { object, entry } of findOptionsObjects(sourceFile)) {
		// The runtime's `theme` is an experiment arm theme, not UI tokens.
		if (entry === 'c15t') {
			continue;
		}
		const property = findProperty(object, 'theme');
		if (!property) {
			continue;
		}
		const theme = objectOf(propertyValueNode(property));
		const hasTokens =
			theme === 'unknown' ||
			theme
				.getProperties()
				.some(
					(item) =>
						Node.isSpreadAssignment(item) ||
						TOKEN_KEYS.has(propertyKey(item) ?? '')
				);
		if (hasTokens && addTodo(property, THEME_TODO, edits)) {
			summaries.add('TODO: theme CSS');
			operations += 1;
		}
		if (theme === 'unknown') {
			continue;
		}
		const slotsProperty = findProperty(theme, 'slots');
		const slots = slotsProperty && objectOf(propertyValueNode(slotsProperty));
		if (!slots || slots === 'unknown') {
			continue;
		}
		const footer = findProperty(slots, 'consentDialogFooter');
		if (
			footer &&
			!findProperty(slots, 'consentWidgetFooter') &&
			(Node.isPropertyAssignment(footer) ||
				Node.isShorthandPropertyAssignment(footer))
		) {
			edits.push(
				Node.isPropertyAssignment(footer)
					? toTextEdit(footer.getNameNode(), 'consentWidgetFooter')
					: toTextEdit(footer, 'consentWidgetFooter: consentDialogFooter')
			);
			summaries.add('slots.consentDialogFooter -> consentWidgetFooter');
			operations += 1;
		}
		const frame = findProperty(slots, 'frame');
		if (frame && addTodo(frame, FRAME_SLOT_TODO, edits)) {
			summaries.add('TODO: slots.frame');
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
 * Marks provider `theme` options that set design tokens with a
 * `TODO(c15t v3)` comment, because v3 renders theme CSS through
 * `ConsentTheme` or `generateThemeCSS()`. Renames the
 * `consentDialogFooter` slot to `consentWidgetFooter` and marks the split
 * `frame` slot.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runThemeToConsentThemeCodemod =
	function runThemeToConsentThemeCodemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		return runTransform(options, transformSourceFile);
	};
