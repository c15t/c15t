/**
 * Names of the `:param` segments in a route template.
 *
 * @example
 * ```ts
 * type Names = PathParamNames<'/experiments/:id/summary'>; // 'id'
 * ```
 */
export type PathParamNames<Path extends string> =
	Path extends `${string}:${infer Param}/${infer Rest}`
		? Param | PathParamNames<`/${Rest}`>
		: Path extends `${string}:${infer Param}`
			? Param
			: never;

/** The values a route template needs, one string per `:param`. */
export type PathParams<Path extends string> = {
	readonly [Name in PathParamNames<Path>]: string;
};

/**
 * Fills a route template's `:param` segments.
 *
 * Every value is percent-encoded, so an id containing `/`, `?` or `#` stays
 * one path segment instead of changing the route.
 *
 * @param template - Route template, such as `/subjects/:id`.
 * @param params - One string per `:param`.
 * @returns The path with every segment filled.
 */
export const buildPath = function buildPath<Path extends string>(
	template: Path,
	params: PathParams<Path>
): string {
	const values: Readonly<Record<string, string>> = params;
	return template.replace(/:(?<name>[A-Za-z]+)/gu, (_match, name: string) =>
		encodeURIComponent(values[name] ?? '')
	);
};
