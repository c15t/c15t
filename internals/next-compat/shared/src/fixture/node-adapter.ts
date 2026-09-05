/**
 * Bridges Node's `http` request/response objects to the Web `Request` and
 * `Response` types the fixture handlers speak.
 *
 * @remarks
 * Pages Router API routes receive a `NextApiRequest`/`NextApiResponse`
 * pair, which extend `IncomingMessage`/`ServerResponse`. App Router route
 * handlers already receive Web objects, so they call
 * {@link handleFixtureRequest} directly.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

type NodeRequest = IncomingMessage & {
	/**
	 * Body already parsed by Next's API route `bodyParser`. Undefined when the
	 * route disables the parser; the raw stream is read instead.
	 */
	body?: unknown;
};

const firstHeaderValue = function firstHeaderValue(
	value: string | string[] | undefined
): string | undefined {
	if (Array.isArray(value)) {
		return value[0];
	}
	return value;
};

const readBody = async function readBody(
	req: NodeRequest
): Promise<BodyInit | undefined> {
	if (req.body !== undefined) {
		return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
	}
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
	}
	return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
};

/**
 * Converts Node-style incoming headers to a Web `Headers` instance.
 */
export const toWebHeaders = function toWebHeaders(
	headers: Record<string, string | string[] | undefined>
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

/**
 * Converts a Node `IncomingMessage` into a Web `Request`.
 *
 * @param req - `req` from a Pages API route or a plain `http` server
 * @returns A `Request` carrying the same method, URL, headers, and body
 */
export const toWebRequest = async function toWebRequest(
	req: NodeRequest
): Promise<Request> {
	const protocol = firstHeaderValue(req.headers['x-forwarded-proto']) ?? 'http';
	const host =
		firstHeaderValue(req.headers['x-forwarded-host']) ??
		req.headers.host ??
		'localhost';
	const url = new URL(req.url ?? '/', `${protocol}://${host}`);

	const headers = new Headers();
	for (const [name, value] of Object.entries(req.headers)) {
		if (value === undefined) {
			continue;
		}
		headers.set(name, Array.isArray(value) ? value.join(', ') : value);
	}

	const method = req.method ?? 'GET';
	const body =
		method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);

	return new Request(url, { body, headers, method });
};

/**
 * Writes a Web `Response` to a Node `ServerResponse`.
 *
 * @param response - The response produced by a fixture handler
 * @param res - `res` from a Pages API route or a plain `http` server
 */
export const writeWebResponse = async function writeWebResponse(
	response: Response,
	res: ServerResponse
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
	res.end(Buffer.from(await response.arrayBuffer()));
};
