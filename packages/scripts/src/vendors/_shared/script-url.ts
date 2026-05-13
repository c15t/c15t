/**
 * Trims an optional string and treats empty or whitespace-only values as
 * missing.
 *
 * @param value - Optional string value, usually a user-provided override.
 * @returns The trimmed string when it contains non-whitespace characters,
 * otherwise `undefined`.
 *
 * @example
 * ```ts
 * trimToUndefined('  https://cdn.example.com  '); // 'https://cdn.example.com'
 * trimToUndefined('   '); // undefined
 * trimToUndefined(undefined); // undefined
 * ```
 */
export function trimToUndefined(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return undefined;
	}

	return trimmed;
}

/**
 * Resolves a script URL from an optional override and a required fallback.
 *
 * @param override - Explicit script URL supplied by the integration caller.
 * @param fallback - Default vendor script URL.
 * @returns `override` when it is defined, otherwise `fallback`.
 *
 * @remarks
 * This helper intentionally does not trim or validate the override. Use
 * `trimToUndefined` before calling this helper when blank string overrides
 * should fall back to the vendor default.
 *
 * @example
 * ```ts
 * resolveScriptUrl(undefined, 'https://cdn.example.com/default.js');
 * // 'https://cdn.example.com/default.js'
 * ```
 *
 * @example
 * ```ts
 * resolveScriptUrl(
 * 	'https://custom.com/script.js',
 * 	'https://cdn.example.com/default.js'
 * );
 * // 'https://custom.com/script.js'
 * ```
 */
export function resolveScriptUrl(
	override: string | undefined,
	fallback: string
): string {
	if (override !== undefined) {
		return override;
	}

	return fallback;
}

/**
 * Removes leading slash characters without using a regular expression.
 *
 * This helper is used on caller-controlled URL fragments, so it intentionally
 * stays linear even for very long repeated slash input.
 */
export function stripLeadingSlashes(value: string): string {
	let index = 0;
	while (index < value.length && value.charCodeAt(index) === 47) {
		index += 1;
	}

	return index === 0 ? value : value.slice(index);
}

/**
 * Removes trailing slash characters without using a regular expression.
 *
 * This helper is used on caller-controlled URL fragments, so it intentionally
 * stays linear even for very long repeated slash input.
 */
export function stripTrailingSlashes(value: string): string {
	let end = value.length;
	while (end > 0 && value.charCodeAt(end - 1) === 47) {
		end -= 1;
	}

	return end === value.length ? value : value.slice(0, end);
}

/**
 * Joins a base URL and path with exactly one slash between them.
 *
 * @param base - Base URL or origin. Trailing slashes are removed before joining.
 * @param path - Path segment. Leading slashes are removed before joining.
 * @returns A slash-joined URL string.
 *
 * @example
 * ```ts
 * joinUrlPath('https://example.com///', '///script.js');
 * // 'https://example.com/script.js'
 *
 * joinUrlPath('https://example.com', 'script.js');
 * // 'https://example.com/script.js'
 * ```
 */
export function joinUrlPath(base: string, path: string): string {
	const trimmedBase = base.trim();
	const trimmedPath = path.trim();

	if (trimmedBase.length === 0) {
		throw new TypeError(
			`joinUrlPath requires a non-empty base URL. Received base=${JSON.stringify(
				base
			)}, path=${JSON.stringify(path)}.`
		);
	}

	if (trimmedPath.length === 0) {
		throw new TypeError(
			`joinUrlPath requires a non-empty path. Received base=${JSON.stringify(
				base
			)}, path=${JSON.stringify(path)}.`
		);
	}

	return `${stripTrailingSlashes(trimmedBase)}/${stripLeadingSlashes(trimmedPath)}`;
}
