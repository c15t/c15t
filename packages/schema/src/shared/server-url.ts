type HeaderSource = Headers | Record<string, string | undefined>;

const getHeader = function getHeader(
	source: HeaderSource,
	name: string
): string | undefined {
	if (typeof (source as Headers).get === 'function') {
		return (source as Headers).get(name) ?? undefined;
	}
	const record = source as Record<string, string | undefined>;
	return record[name] ?? record[name.toLowerCase()];
};

const trimTrailingSlash = function trimTrailingSlash(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
};

const getRefererHost = function getRefererHost(
	headers: HeaderSource
): string | null {
	const referer = getHeader(headers, 'referer');
	if (!referer) {
		return null;
	}
	try {
		return new URL(referer).host || null;
	} catch {
		return null;
	}
};

const IPV4_LITERAL = /^\d{1,3}(?:\.\d{1,3}){3}$/u;
const UNSAFE_HOST_CHARACTER = /[\s/\\?#@]/u;

/**
 * `http` for `localhost`, IP-literal and single-label hosts, which rarely
 * serve TLS; `https` for domain names. Mirrors `resolveRequestOrigin` in
 * `@c15t/core/server`.
 */
const defaultProtocolForHost = function defaultProtocolForHost(
	host: string
): 'http' | 'https' {
	let hostname: string;
	try {
		hostname = new URL(`http://${host}`).hostname.toLowerCase();
	} catch {
		return 'https';
	}
	const isPlainHTTP =
		hostname === 'localhost' ||
		hostname.endsWith('.localhost') ||
		hostname.startsWith('[') ||
		IPV4_LITERAL.test(hostname) ||
		!hostname.includes('.');
	return isPlainHTTP ? 'http' : 'https';
};

/** Options for {@link resolveBackendURL}. */
export interface ResolveBackendURLOptions {
	/**
	 * Restore the previous resolution order: `x-forwarded-proto` /
	 * `x-forwarded-ssl` for the scheme, and `x-forwarded-host`, then `host`,
	 * then the `referer` host. Any client can send those headers, so set
	 * this only behind a proxy that sets them and drops incoming ones.
	 *
	 * @defaultValue false
	 */
	trustForwardedHeaders?: boolean;
}

/**
 * Resolve a backend URL that may be relative into an absolute http(s) URL.
 *
 * A relative URL resolves against the `host` header: over `https` for a
 * domain name, and over `http` for `localhost`, an IP address or a
 * single-label host. `x-forwarded-*` and `referer` are ignored unless
 * `trustForwardedHeaders` is set. Invalid inputs return `null`; this helper
 * never throws.
 *
 * @deprecated Use `resolveRequestBackendURL` from `@c15t/core/server`,
 * which also resolves against the framework's own request URL. This helper
 * sees only headers, and every header it can read is sent by the client.
 *
 * @param backendURL - The configured URL, absolute or `/`-relative.
 * @param headers - The incoming request headers.
 * @param options - `trustForwardedHeaders` to read forwarding headers.
 * @returns The absolute URL, or `null` when it cannot be resolved.
 */
export const resolveBackendURL = function resolveBackendURL(
	backendURL: string,
	headers: HeaderSource,
	options: ResolveBackendURLOptions = {}
): string | null {
	try {
		if (/^https?:\/\//iu.test(backendURL)) {
			return trimTrailingSlash(new URL(backendURL).toString());
		}

		if (!backendURL.startsWith('/') || backendURL.startsWith('//')) {
			return null;
		}

		if (options.trustForwardedHeaders) {
			const proto =
				getHeader(headers, 'x-forwarded-proto') ??
				(getHeader(headers, 'x-forwarded-ssl') === 'on'
					? 'https'
					: undefined) ??
				'https';
			const host =
				getHeader(headers, 'x-forwarded-host') ??
				getHeader(headers, 'host') ??
				getRefererHost(headers);
			if (!host) {
				return null;
			}
			return trimTrailingSlash(`${proto}://${host}${backendURL}`);
		}

		const host = getHeader(headers, 'host')?.trim();
		if (!host || UNSAFE_HOST_CHARACTER.test(host)) {
			return null;
		}
		const { origin } = new URL(`${defaultProtocolForHost(host)}://${host}`);
		const resolved = new URL(`${origin}${backendURL}`);
		if (resolved.origin !== origin) {
			return null;
		}
		return trimTrailingSlash(resolved.toString());
	} catch {
		return null;
	}
};
