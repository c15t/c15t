/** Removes trailing slashes in linear time. @internal */
export const trimTrailingSlashes = function trimTrailingSlashes(
	value: string
): string {
	let end = value.length;
	while (end > 0 && value[end - 1] === '/') {
		end -= 1;
	}
	return value.slice(0, end);
};

/** Removes surrounding slashes, preserving interior path segments. @internal */
export const trimPathSlashes = function trimPathSlashes(value: string): string {
	const trimmed = trimTrailingSlashes(value);
	let start = 0;
	while (start < trimmed.length && trimmed[start] === '/') {
		start += 1;
	}
	return trimmed.slice(start);
};
