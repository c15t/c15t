import type * as TsMorphTypes from 'ts-morph';

import { findOptionsObjects } from './consent-provider-options';
import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import { addTodo, applyEdits, findProperty, UNCHANGED } from './source-edits';
import type { TextEdit, TransformResult } from './source-edits';

const IAB_TODO =
	'The iab provider option was removed. Render <IABProvider> from c15t/react/iab inside the provider, around the IAB components, and pass the options you gave iab() as its props.';

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TransformResult {
	const edits: TextEdit[] = [];
	let operations = 0;
	for (const { object, entry } of findOptionsObjects(sourceFile)) {
		// The v3 runtime still takes `iab`; only the React providers moved it.
		if (entry === 'c15t') {
			continue;
		}
		const property = findProperty(object, 'iab');
		if (property && addTodo(property, IAB_TODO, edits)) {
			operations += 1;
		}
	}
	if (edits.length === 0) {
		return UNCHANGED;
	}
	applyEdits(sourceFile, edits);
	return { changed: true, operations, summaries: ['TODO: iab -> IABProvider'] };
};

/**
 * Marks the `iab` option on React and Next.js providers with a
 * `TODO(c15t v3)` comment. v3 configures IAB TCF through `<IABProvider>`,
 * and the leftover option fails type-checking until it moves.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runIabOptionToIabProviderCodemod =
	function runIabOptionToIabProviderCodemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		return runTransform(options, transformSourceFile);
	};
