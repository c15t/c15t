// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
	captureBrowserLoaderBody,
	captureStreamLoaderBody,
	MAX_LOADER_BODY_BYTES,
} from './loader-body';
import { digestBody } from './probe-policy';

describe('captureBrowserLoaderBody', () => {
	it.each([
		{},
		{ 'content-length': '' },
		{ 'content-length': '-1' },
		{ 'content-length': '12px' },
		{ 'content-length': String(MAX_LOADER_BODY_BYTES + 1) },
		{ 'content-encoding': 'gzip', 'content-length': '12' },
	])('skips body allocation for unsafe headers: %j', async (headers) => {
		const readBody = vi.fn();
		expect(await captureBrowserLoaderBody(headers, readBody)).toBeUndefined();
		expect(readBody).not.toHaveBeenCalled();
	});

	it('retains a body at the exact byte limit', async () => {
		const body = new Uint8Array(MAX_LOADER_BODY_BYTES);
		expect(
			await captureBrowserLoaderBody(
				{
					'content-encoding': 'identity',
					'content-length': String(body.length),
				},
				() => Promise.resolve(body)
			)
		).toBe(body);
	});

	it('omits a body larger than its declared size and the cap', async () => {
		expect(
			await captureBrowserLoaderBody({ 'content-length': '1' }, () =>
				Promise.resolve(new Uint8Array(MAX_LOADER_BODY_BYTES + 1))
			)
		).toBeUndefined();
	});

	it('treats an unreadable browser body as missing provenance', async () => {
		expect(
			await captureBrowserLoaderBody({ 'content-length': '1' }, () =>
				Promise.reject(new Error('body unavailable'))
			)
		).toBeUndefined();
	});
});

describe('captureStreamLoaderBody', () => {
	it('preserves the full hash and byte count across chunk boundaries', async () => {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new TextEncoder().encode('hello '));
				controller.enqueue(new TextEncoder().encode('world'));
				controller.close();
			},
		});
		const body = await captureStreamLoaderBody(stream);
		expect(body?.byteLength).toBe(11);
		expect(body && digestBody(body)).toBe('b94d27b9934d3e08');
		expect(stream.locked).toBe(false);
	});

	it('accepts a complete body at the exact byte limit', async () => {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array(MAX_LOADER_BODY_BYTES));
				controller.close();
			},
		});
		expect((await captureStreamLoaderBody(stream))?.byteLength).toBe(
			MAX_LOADER_BODY_BYTES
		);
	});

	it('cancels a chunked response that crosses the cap without reporting a partial body', async () => {
		const cancel = vi.fn();
		const stream = new ReadableStream<Uint8Array>({
			cancel,
			start(controller) {
				controller.enqueue(new Uint8Array(MAX_LOADER_BODY_BYTES));
				controller.enqueue(new Uint8Array(1));
			},
		});
		expect(await captureStreamLoaderBody(stream)).toBeUndefined();
		expect(cancel).toHaveBeenCalledOnce();
		expect(stream.locked).toBe(false);
	});

	it('omits provenance when a stream fails and releases its reader', async () => {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.error(new Error('connection closed'));
			},
		});
		expect(await captureStreamLoaderBody(stream)).toBeUndefined();
		expect(stream.locked).toBe(false);
	});

	it('omits provenance when no response body exists', async () => {
		expect(await captureStreamLoaderBody(null)).toBeUndefined();
	});
});
