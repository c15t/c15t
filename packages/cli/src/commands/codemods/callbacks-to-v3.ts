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
	propertyValueNode,
	toTextEdit,
	UNCHANGED,
} from './source-edits';
import type { TextEdit, TransformResult } from './source-edits';

const CONSENT_CHANGED_TODO =
	'onConsentChanged is now onChoiceRecorded. It fires on every accept, reject or save, even one that saves the same values, and its payload has snapshot, confirmed and actionAt instead of preferences and previousPreferences.';
const CONSENT_SET_TODO =
	"onConsentSet was removed. Use onPermissionsChanged to react to what may run now, or onChoiceRecorded to react to the visitor's accept, reject or save.";
const BANNER_FETCHED_TODO = {
	kernel:
		'onBannerFetched was removed. Read resolution from the kernel snapshot to know when the policy has resolved.',
	react:
		'onBannerFetched was removed. Read usePolicyResolution() to know when the policy has resolved.',
};

const renameKey = function renameKey(
	property: TsMorphTypes.ObjectLiteralElementLike,
	next: string
): TextEdit | undefined {
	if (Node.isShorthandPropertyAssignment(property)) {
		return toTextEdit(property, `${next}: ${property.getName()}`);
	}
	if (
		Node.isPropertyAssignment(property) ||
		Node.isMethodDeclaration(property)
	) {
		return toTextEdit(property.getNameNode(), next);
	}
	return undefined;
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TransformResult {
	const edits: TextEdit[] = [];
	const summaries = new Set<string>();
	let operations = 0;
	const seen = new Set<number>();
	for (const { object, entry } of findOptionsObjects(sourceFile)) {
		const property = findProperty(object, 'callbacks');
		const callbacks = property && objectLiteralFor(propertyValueNode(property));
		if (!callbacks || seen.has(callbacks.getStart())) {
			continue;
		}
		seen.add(callbacks.getStart());
		const changed = findProperty(callbacks, 'onConsentChanged');
		if (changed) {
			const hasNewName =
				findProperty(callbacks, 'onChoiceRecorded') !== undefined;
			const added = addTodo(changed, CONSENT_CHANGED_TODO, edits);
			const rename = hasNewName
				? undefined
				: renameKey(changed, 'onChoiceRecorded');
			if (rename) {
				edits.push(rename);
				summaries.add('onConsentChanged -> onChoiceRecorded');
			}
			if (added || rename) {
				summaries.add('TODO: onChoiceRecorded payload');
				operations += 1;
			}
		}
		const set = findProperty(callbacks, 'onConsentSet');
		if (set && addTodo(set, CONSENT_SET_TODO, edits)) {
			summaries.add('TODO: onConsentSet');
			operations += 1;
		}
		const fetched = findProperty(callbacks, 'onBannerFetched');
		const message =
			entry === 'c15t' ? BANNER_FETCHED_TODO.kernel : BANNER_FETCHED_TODO.react;
		if (fetched && addTodo(fetched, message, edits)) {
			summaries.add('TODO: onBannerFetched');
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
 * Renames the `onConsentChanged` callback to `onChoiceRecorded` and marks
 * it, `onConsentSet` and `onBannerFetched` with `TODO(c15t v3)` comments
 * that describe the v3 replacement. `onConsentSet` and `onBannerFetched`
 * stay in place, so type-checking fails until they are replaced.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runCallbacksToV3Codemod = function runCallbacksToV3Codemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	return runTransform(options, transformSourceFile);
};
