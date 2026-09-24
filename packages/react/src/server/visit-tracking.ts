interface SSRVisitRequest {
	visitId: string;
	origin: string;
}

function httpOrigin(value: string | null): string | undefined {
	if (!value) return undefined;
	try {
		const url = new URL(value);
		if (
			!['http:', 'https:'].includes(url.protocol) ||
			url.username ||
			url.password ||
			url.pathname !== '/' ||
			url.search ||
			url.hash
		) {
			return undefined;
		}
		return url.origin;
	} catch {
		return undefined;
	}
}

/** A server initialisation is request-scoped, never proof the browser loaded. */
export function createSSRVisitRequest(
	headers: Headers,
	enabled?: boolean
): SSRVisitRequest | undefined {
	if (!enabled) return undefined;
	if (
		headers.has('next-router-prefetch') ||
		headers.has('x-middleware-prefetch') ||
		['purpose', 'sec-purpose'].some((name) =>
			/\b(prefetch|prerender)\b/i.test(headers.get(name) ?? '')
		)
	) {
		return undefined;
	}

	const host = headers.get('x-forwarded-host') || headers.get('host');
	const protocol = headers.get('x-forwarded-proto') || 'https';
	const origin =
		httpOrigin(headers.get('origin')) ??
		(host ? httpOrigin(`${protocol}://${host}`) : undefined);
	if (!origin) return undefined;

	try {
		if (typeof globalThis.crypto?.randomUUID !== 'function') return undefined;
		return { visitId: globalThis.crypto.randomUUID(), origin };
	} catch {
		return undefined;
	}
}

/** Only the response to this exact request may be attributed during hydration. */
export function matchesSSRVisitEcho(init: unknown, visitId: string): boolean {
	if (typeof init !== 'object' || init === null || !('visitTracking' in init)) {
		return false;
	}
	const tracking = init.visitTracking;
	return (
		typeof tracking === 'object' &&
		tracking !== null &&
		'enabled' in tracking &&
		tracking.enabled === true &&
		'visitId' in tracking &&
		tracking.visitId === visitId
	);
}
