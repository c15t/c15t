// CORS middleware utility for c15t
const WWW_REGEX = /^www\./;
export function createCORSOptions(trustedOrigins?: string[]) {
	function normalizeOrigin(origin: string): string {
		try {
			const url = new URL(origin);
			// Remove 'www.' if present
			const hostname = url.hostname.replace(WWW_REGEX, '');
			return `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ''}`;
		} catch {
			return origin;
		}
	}

	function expandWithWWW(origins: string[]): string[] {
		const expanded = new Set<string>();
		for (const origin of origins) {
			try {
				const url = new URL(origin);
				const base = `${url.protocol}//${url.hostname.replace(WWW_REGEX, '')}${url.port ? `:${url.port}` : ''}`;
				expanded.add(base);
				expanded.add(
					`${url.protocol}//www.${url.hostname.replace(WWW_REGEX, '')}${url.port ? `:${url.port}` : ''}`
				);
			} catch {
				expanded.add(origin);
			}
		}
		return Array.from(expanded);
	}

	if (trustedOrigins) {
		const expandedTrusted = expandWithWWW(trustedOrigins);
		return {
			origin: (origin: string) => {
				if (!origin) {
					return '*';
				}
				const normalizedOrigin = normalizeOrigin(origin);
				if (expandedTrusted.includes('*')) {
					return origin;
				}
				if (expandedTrusted.includes(normalizedOrigin)) {
					return origin;
				}
				// Standard CORS: just return null for untrusted origins
				return null;
			},
			credentials: true,
			allowHeaders: ['Content-Type', 'Authorization'],
			maxAge: 600,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		};
	}
	return {
		origin: '*',
		credentials: false,
		allowHeaders: ['Content-Type', 'Authorization'],
		maxAge: 600,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	};
}
