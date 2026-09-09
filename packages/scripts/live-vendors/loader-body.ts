/** Maximum decoded loader bytes retained for report provenance. */
export const MAX_LOADER_BODY_BYTES = 2 * 1024 * 1024;

const CONTENT_LENGTH = /^\d+$/u;

/**
 * Captures a browser body only when its headers bound the decoded size.
 * Playwright buffers the entire body, so unknown or compressed sizes are
 * skipped. This limits provenance capture, not Chromium's script execution.
 *
 * @param headers - Lowercase response headers.
 * @param readBody - Reads the complete browser response with a timeout.
 * @returns The complete body within the limit, or undefined if unavailable.
 */
export const captureBrowserLoaderBody = async function captureBrowserLoaderBody(
	headers: Record<string, string | undefined>,
	readBody: () => Promise<Uint8Array>
): Promise<Uint8Array | undefined> {
	const length = headers['content-length'];
	const encoding = headers['content-encoding'];
	if (
		length === undefined ||
		!CONTENT_LENGTH.test(length) ||
		Number(length) > MAX_LOADER_BODY_BYTES ||
		(encoding !== undefined && encoding.trim().toLowerCase() !== 'identity')
	) {
		return undefined;
	}

	try {
		const body = await readBody();
		return body.byteLength <= MAX_LOADER_BODY_BYTES ? body : undefined;
	} catch {
		return undefined;
	}
};

/**
 * Reads a fetch response up to the decoded byte limit and cancels overflow.
 *
 * @param stream - Fetch response body, with the request timeout still active.
 * @returns The complete body within the limit, or undefined if unavailable.
 */
export const captureStreamLoaderBody = async function captureStreamLoaderBody(
	stream: ReadableStream<Uint8Array> | null
): Promise<Uint8Array | undefined> {
	if (!stream) {
		return undefined;
	}

	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	try {
		while (true) {
			// oxlint-disable-next-line no-await-in-loop -- Read one chunk at a time to enforce the byte cap before requesting more.
			const { done, value } = await reader.read();
			if (done) {
				const body = new Uint8Array(bytes);
				let offset = 0;
				for (const chunk of chunks) {
					body.set(chunk, offset);
					offset += chunk.byteLength;
				}
				return body;
			}
			bytes += value.byteLength;
			if (bytes > MAX_LOADER_BODY_BYTES) {
				// oxlint-disable-next-line no-await-in-loop -- Cancel the current stream before releasing its reader.
				await reader.cancel();
				return undefined;
			}
			chunks.push(value);
		}
	} catch {
		return undefined;
	} finally {
		reader.releaseLock();
	}
};
