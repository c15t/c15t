/**
 * Server HTML stream capture for the browser benches.
 *
 * `page.goto(...).text()` and `page.content()` only expose the finished
 * document, so a check against them cannot tell whether banner markup was in
 * the first bytes the server flushed or in a chunk streamed after an awaited
 * consent resolution. These helpers read the raw HTTP response body chunk by
 * chunk (no content encoding) and report both answers separately.
 */
import { request as httpRequest } from 'node:http';
import { performance } from 'node:perf_hooks';

/** One body chunk as delivered by the socket, with its arrival time. */
export interface HtmlStreamChunk {
	/** Milliseconds from request start to this chunk's arrival. */
	atMs: number;
	text: string;
}

export interface ServerHtmlStreamCapture {
	status: number;
	/** Milliseconds from request start to response headers. */
	headersMs: number;
	chunks: HtmlStreamChunk[];
	/** Milliseconds from request start to the end of the body. */
	doneMs: number;
}

export interface ServerHtmlStreamAnalysis {
	chunkCount: number;
	firstChunkBytes: number;
	totalBytes: number;
	/** Milliseconds from request start to the first body chunk. */
	firstChunkMs: number | null;
	/** Banner markup appears inside the first body chunk. */
	bannerInFirstChunk: boolean;
	/** Banner markup appears anywhere in the complete server HTML. */
	bannerInServerHtml: boolean;
	/** Zero-based index of the chunk that completed the banner markup. */
	bannerChunkIndex: number | null;
	/** Arrival time of the chunk that completed the banner markup. */
	bannerMarkupMs: number | null;
}

/** Attribute spellings that identify server-rendered banner markup. */
export const bannerMarkupMarkers = function bannerMarkupMarkers(
	testId: string
): string[] {
	return [`data-testid="${testId}"`, `data-testid='${testId}'`];
};

const utf8Length = function utf8Length(value: string): number {
	return Buffer.byteLength(value, 'utf8');
};

/**
 * Locate banner markup in a captured stream. Pure: matches that straddle a
 * chunk boundary are attributed to the chunk that completes them, so a
 * marker split across chunks 0 and 1 counts as arriving in chunk 1.
 *
 * @param chunks - Body chunks in arrival order.
 * @param markers - Any of these substrings marks the banner.
 * @returns First-chunk and full-document answers plus arrival details.
 */
export const analyzeServerHtmlStream = function analyzeServerHtmlStream(
	chunks: readonly HtmlStreamChunk[],
	markers: readonly string[]
): ServerHtmlStreamAnalysis {
	const [firstChunk] = chunks;
	const containsMarker = (value: string) =>
		markers.some((marker) => value.includes(marker));

	let cumulative = '';
	let bannerChunkIndex: number | null = null;
	for (const [index, chunk] of chunks.entries()) {
		cumulative += chunk.text;
		if (bannerChunkIndex === null && containsMarker(cumulative)) {
			bannerChunkIndex = index;
		}
	}

	return {
		bannerChunkIndex,
		bannerInFirstChunk: bannerChunkIndex === 0,
		bannerInServerHtml: bannerChunkIndex !== null,
		bannerMarkupMs:
			bannerChunkIndex === null
				? null
				: (chunks[bannerChunkIndex]?.atMs ?? null),
		chunkCount: chunks.length,
		firstChunkBytes: firstChunk ? utf8Length(firstChunk.text) : 0,
		firstChunkMs: firstChunk ? firstChunk.atMs : null,
		totalBytes: utf8Length(cumulative),
	};
};

export interface ReadServerHtmlStreamOptions {
	/** Value for the `cookie` request header, for saved-consent visits. */
	cookie?: string;
	headers?: Record<string, string>;
	timeoutMs?: number;
}

/**
 * GET a URL and record each body chunk as the socket delivers it. Requests
 * `accept-encoding: identity` so chunk boundaries are the server's flushes
 * rather than decompressor output.
 *
 * @param url - Absolute `http:` URL of the page.
 * @param options - Cookie, extra headers, and timeout.
 * @returns Status, header timing, and the chunks in arrival order.
 * @throws {Error} When the request fails or exceeds the timeout.
 */
export const readServerHtmlStream = async function readServerHtmlStream(
	url: string,
	options: ReadServerHtmlStreamOptions = {}
): Promise<ServerHtmlStreamCapture> {
	const target = new URL(url);
	if (target.protocol !== 'http:') {
		throw new Error(`readServerHtmlStream expects an http: URL, got ${url}`);
	}
	const headers: Record<string, string> = {
		accept: 'text/html',
		'accept-encoding': 'identity',
		...options.headers,
	};
	if (options.cookie) {
		headers.cookie = options.cookie;
	}

	return await new Promise<ServerHtmlStreamCapture>((resolve, reject) => {
		const startedAt = performance.now();
		const elapsed = () => Number((performance.now() - startedAt).toFixed(3));
		const chunks: HtmlStreamChunk[] = [];
		const decoder = new TextDecoder();
		const req = httpRequest(
			target,
			{ agent: false, headers, method: 'GET' },
			(response) => {
				const headersMs = elapsed();
				response.on('data', (buffer: Buffer) => {
					chunks.push({
						atMs: elapsed(),
						text: decoder.decode(buffer, { stream: true }),
					});
				});
				response.on('end', () => {
					const tail = decoder.decode();
					const last = chunks.at(-1);
					if (tail && last) {
						last.text += tail;
					}
					resolve({
						chunks,
						doneMs: elapsed(),
						headersMs,
						status: response.statusCode ?? 0,
					});
				});
				response.on('error', reject);
			}
		);
		req.setTimeout(options.timeoutMs ?? 30_000, () => {
			req.destroy(new Error(`Timed out reading ${url}`));
		});
		req.on('error', reject);
		req.end();
	});
};

/**
 * Render a Playwright cookie list as a `cookie` request header.
 *
 * @param cookies - Name/value pairs, for example from `context.cookies()`.
 * @returns The header value, or `undefined` when there are no cookies.
 */
export const toCookieHeader = function toCookieHeader(
	cookies: readonly { name: string; value: string }[]
): string | undefined {
	if (cookies.length === 0) {
		return undefined;
	}
	return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
};
