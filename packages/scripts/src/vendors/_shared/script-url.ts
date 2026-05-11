/**
 * Trims an optional string and treats empty or whitespace-only values as
 * missing.
 *
 * @param value - Optional string value, usually a user-provided override.
 * @returns The trimmed string when it contains non-whitespace characters,
 * otherwise `undefined`.
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
 * Joins a base URL and path with exactly one slash between them.
 *
 * @param base - Base URL or origin. Trailing slashes are removed before joining.
 * @param path - Path segment. Leading slashes are removed before joining.
 * @returns A slash-joined URL string.
 */
export function joinUrlPath(base: string, path: string): string {
	return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
