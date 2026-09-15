import { Node, SyntaxKind } from 'ts-morph';
import type { ObjectLiteralExpression, PropertyAssignment } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';

const LEGACY_KEY = 'ignoreGeoLocation';
const NEXT_KEY = 'overrides';
const DEFAULT_COUNTRY_CODE = 'DE';

interface IgnoreGeoLocationResult {
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

const objectHasCountry = function objectHasCountry(
	objectLiteral: ObjectLiteralExpression
): boolean {
	for (const property of objectLiteral.getProperties()) {
		if (!Node.isPropertyAssignment(property)) {
			continue;
		}
		if (getPropertyName(property) === 'country') {
			return true;
		}
	}

	return false;
};

const mergeCountryIntoOverridesExpression =
	function mergeCountryIntoOverridesExpression(
		overridesExpressionText: string,
		ignoreExpressionText: string
	): string {
		if (ignoreExpressionText === 'true') {
			return `{ ...(${overridesExpressionText}), country: (${overridesExpressionText})?.country ?? '${DEFAULT_COUNTRY_CODE}' }`;
		}

		if (ignoreExpressionText === 'false') {
			return overridesExpressionText;
		}

		return `${ignoreExpressionText} ? { ...(${overridesExpressionText}), country: (${overridesExpressionText})?.country ?? '${DEFAULT_COUNTRY_CODE}' } : (${overridesExpressionText})`;
	};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): IgnoreGeoLocationResult {
	let operations = 0;
	const summaries: string[] = [];

	const propertyAssignments = sourceFile.getDescendantsOfKind(
		SyntaxKind.PropertyAssignment
	);
	for (const property of propertyAssignments) {
		if (property.wasForgotten() || getPropertyName(property) !== LEGACY_KEY) {
			continue;
		}

		const parentObject = property.getParentIfKind(
			SyntaxKind.ObjectLiteralExpression
		);
		if (!parentObject) {
			continue;
		}

		const ignoreExpressionText =
			property.getInitializer()?.getText()?.trim() ?? 'true';
		const overridesProperty = getProperty(parentObject, NEXT_KEY);

		if (!overridesProperty) {
			if (ignoreExpressionText === 'false') {
				property.remove();
				operations += 1;
				summaries.push('removed ignoreGeoLocation: false');
				continue;
			}

			property.getNameNode().replaceWithText(NEXT_KEY);
			if (ignoreExpressionText === 'true') {
				property.setInitializer(`{ country: '${DEFAULT_COUNTRY_CODE}' }`);
				summaries.push('ignoreGeoLocation -> overrides.country');
			} else {
				property.setInitializer(
					`${ignoreExpressionText} ? { country: '${DEFAULT_COUNTRY_CODE}' } : undefined`
				);
				summaries.push(
					'ignoreGeoLocation expression -> conditional overrides.country'
				);
			}
			operations += 1;
			continue;
		}

		const overridesInitializer = overridesProperty.getInitializer();
		const overridesObject = overridesInitializer?.asKind(
			SyntaxKind.ObjectLiteralExpression
		);

		if (overridesObject) {
			if (!objectHasCountry(overridesObject)) {
				if (ignoreExpressionText === 'true') {
					overridesObject.addPropertyAssignment({
						initializer: `'${DEFAULT_COUNTRY_CODE}'`,
						name: 'country',
					});
					summaries.push('merged ignoreGeoLocation into overrides.country');
					operations += 1;
				} else if (ignoreExpressionText !== 'false') {
					overridesObject.addPropertyAssignment({
						initializer: `${ignoreExpressionText} ? '${DEFAULT_COUNTRY_CODE}' : undefined`,
						name: 'country',
					});
					summaries.push(
						'merged ignoreGeoLocation expression into overrides.country'
					);
					operations += 1;
				}
			}
		} else if (overridesInitializer) {
			const mergedExpression = mergeCountryIntoOverridesExpression(
				overridesInitializer.getText().trim(),
				ignoreExpressionText
			);
			if (mergedExpression !== overridesInitializer.getText().trim()) {
				overridesProperty.setInitializer(mergedExpression);
				summaries.push(
					'merged ignoreGeoLocation into existing overrides expression'
				);
				operations += 1;
			}
		}

		property.remove();
		operations += 1;
		summaries.push('removed ignoreGeoLocation property');
	}

	return {
		changed: operations > 0,
		operations,
		summaries: [...new Set(summaries)],
	};
};

/**
 * Runs a codemod that migrates ignoreGeoLocation to overrides-based location forcing.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 */
export const runIgnoreGeoLocationToOverridesCodemod =
	function runIgnoreGeoLocationToOverridesCodemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		return runTransform(options, transformSourceFile);
	};

export type { CodemodRunOptions, CodemodRunResult } from './runner';
