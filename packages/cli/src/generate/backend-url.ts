/**
 * Whether a character can change what a URL means without showing it. The
 * URL parser silently drops tabs and newlines, so a value that parses can
 * still carry hidden text.
 */
const isHiddenCharacter = (character: string): boolean => {
	const code = character.charCodeAt(0);
	return (
		code <= 0x20 || (code >= 0x7f && code <= 0x9f) || /\s/u.test(character)
	);
};

/**
 * Validate a hosted consent backend URL and normalize it.
 * @param input Backend URL as the user or host supplied it.
 * @returns The parsed URL, without a trailing slash when it has no path.
 * @throws {Error} When the URL contains whitespace or control characters,
 * does not parse, is not HTTP or HTTPS, or embeds credentials.
 * @example
 * readBackendURL('https://Consent.Example.com/'); // 'https://consent.example.com'
 */
export const readBackendURL = (input: string): string => {
	if ([...input].some(isHiddenCharacter)) {
		throw new Error(
			'Backend URLs cannot contain whitespace or control characters.'
		);
	}
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		throw new Error('Supply a valid HTTP or HTTPS URL with --backend-url.');
	}
	if (
		(url.protocol !== 'http:' && url.protocol !== 'https:') ||
		url.username ||
		url.password
	) {
		throw new Error(
			'Use an HTTP or HTTPS backend URL without embedded credentials.'
		);
	}
	return url.pathname === '/' && !url.search && !url.hash
		? url.origin
		: url.href;
};
