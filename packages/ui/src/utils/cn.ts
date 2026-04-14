export type ClassDictionary = Record<string, unknown>;
export type ClassArray = ClassValue[];
export type ClassValue =
	| string
	| number
	| bigint
	| boolean
	| null
	| undefined
	| ClassDictionary
	| ClassArray;

function pushClassNames(tokens: string[], value: ClassValue): void {
	if (!value) {
		return;
	}

	if (typeof value === 'boolean') {
		return;
	}

	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'bigint'
	) {
		tokens.push(String(value));
		return;
	}

	if (Array.isArray(value)) {
		for (const entry of value) {
			pushClassNames(tokens, entry);
		}

		return;
	}

	const dictionary = value as ClassDictionary;

	for (const key in dictionary) {
		if (
			Object.prototype.hasOwnProperty.call(dictionary, key) &&
			dictionary[key]
		) {
			tokens.push(key);
		}
	}
}

/**
 * Framework-agnostic class merging for c15t UI packages.
 */
export function cn(...classes: ClassValue[]) {
	const tokens: string[] = [];

	for (const value of classes) {
		pushClassNames(tokens, value);
	}

	return tokens.join(' ');
}
