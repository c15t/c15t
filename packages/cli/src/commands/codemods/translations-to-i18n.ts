import { Node, SyntaxKind } from 'ts-morph';
import type { ObjectLiteralExpression, PropertyAssignment } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';

interface TranslationsToI18nResult {
	changed: boolean;
	operations: number;
	summaries: string[];
}

const getPropertyName = function getPropertyName(
	property: PropertyAssignment
): string {
	const rawName = property.getNameNode().getText().trim();
	return rawName.replace(/^['"]|['"]$/gu, '');
};

const getProperty = function getProperty(
	objectLiteral: ObjectLiteralExpression,
	name: string
): PropertyAssignment | undefined {
	for (const property of objectLiteral.getProperties()) {
		if (!Node.isPropertyAssignment(property)) {
			continue;
		}

		if (getPropertyName(property) === name) {
			return property;
		}
	}

	return undefined;
};

const hasProperty = function hasProperty(
	objectLiteral: ObjectLiteralExpression,
	name: string
): boolean {
	return Boolean(getProperty(objectLiteral, name));
};

const renameProperty = function renameProperty(
	property: PropertyAssignment,
	nextName: string
): void {
	property.getNameNode().replaceWithText(nextName);
};

const isLegacyTranslationConfigObject =
	function isLegacyTranslationConfigObject(
		objectLiteral: ObjectLiteralExpression
	): boolean {
		// Heuristic: treat objects as legacy translation config when they include
		// defaultLanguage/disableAutoLanguageSwitch, or a bare "translations" map
		// without sibling "language", "i18n", "messages", or "locale" keys.
		// Limitation: unrelated objects using these property names can be false positives.
		const hasDefaultLanguage = hasProperty(objectLiteral, 'defaultLanguage');
		const hasDisableAutoLanguageSwitch = hasProperty(
			objectLiteral,
			'disableAutoLanguageSwitch'
		);
		const hasTranslations = hasProperty(objectLiteral, 'translations');
		const hasLanguage = hasProperty(objectLiteral, 'language');
		const hasI18n = hasProperty(objectLiteral, 'i18n');
		const hasMessages = hasProperty(objectLiteral, 'messages');
		const hasLocale = hasProperty(objectLiteral, 'locale');

		if (hasDefaultLanguage || hasDisableAutoLanguageSwitch) {
			return true;
		}

		// This catches minimal legacy configs like:
		// { translations: { de: { ... } } }
		// while avoiding init response objects like:
		// { language: 'de', translations: { ... } }
		if (
			hasTranslations &&
			!hasLanguage &&
			!hasI18n &&
			!hasMessages &&
			!hasLocale
		) {
			return true;
		}

		return false;
	};

const invertExpression = function invertExpression(
	expressionText: string
): string {
	const trimmed = expressionText.trim();

	if (trimmed === 'true') {
		return 'false';
	}

	if (trimmed === 'false') {
		return 'true';
	}

	if (trimmed.startsWith('!')) {
		return trimmed.slice(1).trim();
	}

	return `!(${trimmed})`;
};

const transformLegacyConfigObject = function transformLegacyConfigObject(
	objectLiteral: ObjectLiteralExpression
): TranslationsToI18nResult {
	let operations = 0;
	const summaries: string[] = [];

	// Step 1: nested translations -> messages
	const translationsProperty = getProperty(objectLiteral, 'translations');
	if (translationsProperty && !hasProperty(objectLiteral, 'messages')) {
		renameProperty(translationsProperty, 'messages');
		operations += 1;
		summaries.push('translations -> messages');
	}

	// Step 2: defaultLanguage -> locale
	const defaultLanguageProperty = getProperty(objectLiteral, 'defaultLanguage');
	if (defaultLanguageProperty && !hasProperty(objectLiteral, 'locale')) {
		renameProperty(defaultLanguageProperty, 'locale');
		operations += 1;
		summaries.push('defaultLanguage -> locale');
	}

	// Step 3: disableAutoLanguageSwitch -> detectBrowserLanguage (inverted)
	const disableAutoSwitchProperty = getProperty(
		objectLiteral,
		'disableAutoLanguageSwitch'
	);
	if (
		disableAutoSwitchProperty &&
		!hasProperty(objectLiteral, 'detectBrowserLanguage')
	) {
		const initializer = disableAutoSwitchProperty.getInitializer();
		const expressionText = initializer?.getText() ?? 'false';

		renameProperty(disableAutoSwitchProperty, 'detectBrowserLanguage');
		disableAutoSwitchProperty.setInitializer(invertExpression(expressionText));
		operations += 1;
		summaries.push('disableAutoLanguageSwitch -> detectBrowserLanguage');
	}

	return {
		changed: operations > 0,
		operations,
		summaries,
	};
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TranslationsToI18nResult {
	let operations = 0;
	const summaries: string[] = [];

	const propertyAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAssignment
	);

	for (const property of propertyAssignments) {
		if (getPropertyName(property) !== 'translations') {
			continue;
		}

		const parentObject = property.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!parentObject) {
			continue;
		}

		const initializer = property.getInitializerIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!initializer || !isLegacyTranslationConfigObject(initializer)) {
			continue;
		}

		// Avoid rewriting mixed objects that already provide i18n explicitly.
		if (hasProperty(parentObject, 'i18n')) {
			continue;
		}

		// Step 1: options.translations -> options.i18n
		renameProperty(property, 'i18n');
		operations += 1;
		summaries.push('options.translations -> options.i18n');

		const result = transformLegacyConfigObject(initializer);
		operations += result.operations;
		summaries.push(...result.summaries);
	}

	return {
		changed: operations > 0,
		operations,
		summaries: [...new Set(summaries)],
	};
};

/**
 * Runs the legacy translations-to-i18n codemod across project source files.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 *
 * @example
 * ```ts
 * const result = await runTranslationsToI18nCodemod({
 *   projectRoot: process.cwd(),
 *   dryRun: true,
 * });
 * ```
 *
 * @throws {Error} Propagates unexpected setup failures such as directory traversal errors.
 */
export const runTranslationsToI18nCodemod =
	function runTranslationsToI18nCodemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		return runTransform(options, transformSourceFile);
	};

export type { CodemodRunOptions, CodemodRunResult } from './runner';
