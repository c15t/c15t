/**
 * Bridges Node's `http` request and response objects to the Web `Request`,
 * `Response`, and `Headers` types the server helpers and route handlers
 * speak. Typed structurally so the public `@c15t/nextjs/pages` surface does
 * not depend on `@types/node`.
 */

/**
 * Node-style incoming headers: lowercase names, arrays for repeated headers.
 * `IncomingHttpHeaders` from `node:http` satisfies this shape.
 */
export type NodeIncomingHeaders = Record<string, string | string[] | undefined>;

/**
 * The part of a Node `IncomingMessage` the server helpers read.
 */
export interface NodeRequestLike {
	headers: NodeIncomingHeaders;
}

/**
 * The part of a Node `IncomingMessage` the API bridge reads. `NextApiRequest`
 * and the `req` of `getServerSideProps` both satisfy it.
 */
export interface NodeApiRequestLike extends NodeRequestLike {
	/**
	 * Body already parsed by Next's API route `bodyParser`. Left undefined when
	 * the route disables the parser, in which case the raw stream is read.
	 */
	body?: unknown;
	method?: string;
	url?: string;
	[Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>;
}

/**
 * The part of a Node `ServerResponse` the API bridge writes to.
 * `NextApiResponse` satisfies it.
 */
export interface NodeApiResponseLike {
	statusCode: number;
	setHeader: (name: string, value: string | string[]) => unknown;
	write: (chunk: Uint8Array) => unknown;
	end: (chunk?: Uint8Array) => unknown;
}

const firstHeaderValue = function firstHeaderValue(
	value: string | string[] | undefined
): string | undefined {
	return Array.isArray(value) ? value[0] : value;
};

/**
 * Converts Node-style incoming headers to a Web `Headers` instance.
 * Repeated headers are joined with `, `; undefined entries are skipped.
 */
export const toWebHeaders = function toWebHeaders(
	headers: NodeIncomingHeaders
): Headers {
	const webHeaders = new Headers();
	for (const [name, value] of Object.entries(headers)) {
		if (value === undefined) {
			continue;
		}
		webHeaders.set(name, Array.isArray(value) ? value.join(', ') : value);
	}
	return webHeaders;
};

const concatChunks = function concatChunks(
	chunks: Uint8Array[]
): Uint8Array<ArrayBuffer> {
	let length = 0;
	for (const chunk of chunks) {
		length += chunk.byteLength;
	}
	const out = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return out;
};

const readBody = async function readBody(
	req: NodeApiRequestLike
): Promise<BodyInit | undefined> {
	if (req.body !== undefined) {
		return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
	}
	const iterate = req[Symbol.asyncIterator];
	if (!iterate) {
		return undefined;
	}
	const stream: AsyncIterable<Uint8Array | string> = {
		[Symbol.asyncIterator]: () => iterate.call(req),
	};
	const encoder = new TextEncoder();
	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) {
		chunks.push(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
	}
	return chunks.length > 0 ? concatChunks(chunks) : undefined;
};

/**
 * Converts a Node `IncomingMessage` into a Web `Request`. The URL is rebuilt
 * from `x-forwarded-proto`, `x-forwarded-host`/`host`, and `req.url`, the
 * same inputs the route handlers use to resolve a relative backend URL.
 */
export const toWebRequest = async function toWebRequest(
	req: NodeApiRequestLike
): Promise<Request> {
	const protocol = firstHeaderValue(req.headers['x-forwarded-proto']) ?? 'http';
	const host =
		firstHeaderValue(req.headers['x-forwarded-host']) ??
		firstHeaderValue(req.headers.host) ??
		'localhost';
	const url = new URL(req.url ?? '/', `${protocol}://${host}`);
	const method = req.method ?? 'GET';
	const body =
		method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);
	return new Request(url, { body, headers: toWebHeaders(req.headers), method });
};

/**
 * Writes a Web `Response` to a Node `ServerResponse`: status, headers
 * (`set-cookie` as separate values), then the body streamed chunk by chunk.
 */
export const writeWebResponse = async function writeWebResponse(
	response: Response,
	res: NodeApiResponseLike
): Promise<void> {
	res.statusCode = response.status;
	response.headers.forEach((value, name) => {
		if (name !== 'set-cookie') {
			res.setHeader(name, value);
		}
	});
	const cookies = response.headers.getSetCookie();
	if (cookies.length > 0) {
		res.setHeader('set-cookie', cookies);
	}
	if (!response.body) {
		res.end();
		return;
	}
	await response.body.pipeTo(
		new WritableStream<Uint8Array>({
			close() {
				res.end();
			},
			write(chunk) {
				res.write(chunk);
			},
		})
	);
};
