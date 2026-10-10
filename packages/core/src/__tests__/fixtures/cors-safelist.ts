/**
 * The Fetch standard's CORS-safelisted request headers, as a test oracle.
 *
 * A cross-origin request whose method is `GET`, `HEAD` or `POST` and whose
 * headers all pass this check is a "simple request": the browser sends it
 * without an `OPTIONS` preflight. Any other header, a value the safelist
 * rejects, or a forbidden header such as `Sec-GPC` (which a browser drops
 * and so never reaches the backend) fails it.
 *
 * @see https://fetch.spec.whatwg.org/#cors-safelisted-request-header
 */

const SIMPLE_METHODS = new Set(['GET', 'HEAD', 'POST']);

/** Bytes the spec calls CORS-unsafe request-header bytes. */
const hasUnsafeByte = (value: string): boolean =>
	[...value].some((char) => {
		const code = char.charCodeAt(0);
		return (
			(code < 0x20 && code !== 0x09) ||
			code === 0x7f ||
			'"():<>?@[\\]{}'.includes(char)
		);
	});

const LANGUAGE_VALUE = /^[\d A-Za-z*,\-.;=]*$/u;

const SIMPLE_CONTENT_TYPES = new Set([
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain',
]);

const isSafelisted = (name: string, value: string): boolean => {
	if (value.length > 128) {
		return false;
	}
	switch (name) {
		case 'accept':
			return !hasUnsafeByte(value);
		case 'accept-language':
		case 'content-language':
			return LANGUAGE_VALUE.test(value);
		case 'content-type': {
			const essence = value.split(';')[0]?.trim().toLowerCase() ?? '';
			return !hasUnsafeByte(value) && SIMPLE_CONTENT_TYPES.has(essence);
		}
		case 'range':
			return /^bytes=\d+-\d*$/u.test(value);
		default:
			return false;
	}
};

const toEntries = (headers: HeadersInit | undefined): [string, string][] => {
	if (!headers) {
		return [];
	}
	if (headers instanceof Headers) {
		return [...headers.entries()];
	}
	if (Array.isArray(headers)) {
		return headers.map(([name, value]) => [name ?? '', value ?? '']);
	}
	return Object.entries(headers);
};

/**
 * The reasons a fetch would need a CORS preflight, or none for a simple
 * request.
 *
 * @param init - The fetch options the code under test sent.
 * @returns One message per method or header that breaks the safelist.
 */
export const corsPreflightReasons = function corsPreflightReasons(
	init: RequestInit | undefined
): string[] {
	const reasons: string[] = [];
	const method = (init?.method ?? 'GET').toUpperCase();
	if (!SIMPLE_METHODS.has(method)) {
		reasons.push(`method ${method}`);
	}
	let total = 0;
	for (const [rawName, value] of toEntries(init?.headers)) {
		const name = rawName.toLowerCase();
		if (isSafelisted(name, value)) {
			total += value.length;
		} else {
			reasons.push(`header ${name}: ${value}`);
		}
	}
	if (total > 1024) {
		reasons.push(`safelisted header values total ${total} bytes`);
	}
	return reasons;
};
