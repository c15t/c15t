type HeaderSource = Headers | Record<string, string | undefined>;

function getHeader(source: HeaderSource, name: string): string | undefined {
	if (typeof (source as Headers).get === 'function') {
		return (source as Headers).get(name) ?? undefined;
	}
	const record = source as Record<string, string | undefined>;
	return record[name] ?? record[name.toLowerCase()];
}

function trimTrailingSlash(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getRefererHost(headers: HeaderSource): string | null {
	const referer = getHeader(headers, 'referer');
	if (!referer) return null;
	try {
		return new URL(referer).host || null;
	} catch {
		return null;
	}
}

/**
 * Resolve a backend URL that may be relative into an absolute http(s) URL.
 *
 * Relative URLs require a request host from proxy headers, `host`, or the
 * referer host. Invalid inputs return `null`; this helper never throws.
 */
export function resolveBackendURL(
	backendURL: string,
	headers: HeaderSource
): string | null {
	try {
		if (/^https?:\/\//i.test(backendURL)) {
			return trimTrailingSlash(new URL(backendURL).toString());
		}

		if (!backendURL.startsWith('/')) {
			return null;
		}

		const proto =
			getHeader(headers, 'x-forwarded-proto') ??
			(getHeader(headers, 'x-forwarded-ssl') === 'on' ? 'https' : undefined) ??
			'https';
		const host =
			getHeader(headers, 'x-forwarded-host') ??
			getHeader(headers, 'host') ??
			getRefererHost(headers);

		if (!host) return null;

		return trimTrailingSlash(`${proto}://${host}${backendURL}`);
	} catch {
		return null;
	}
}
