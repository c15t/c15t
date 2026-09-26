import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

import { afterEach, describe, expect, it } from 'vitest';

import {
	analyzeServerHtmlStream,
	bannerMarkupMarkers,
	readServerHtmlStream,
	toCookieHeader,
} from './html-stream';

const markers = bannerMarkupMarkers('consent-banner-root');
const banner = '<div data-testid="consent-banner-root">Cookies</div>';

describe('analyzeServerHtmlStream', () => {
	it('separates a banner streamed after the shell from one in the first chunk', () => {
		const streamed = analyzeServerHtmlStream(
			[
				{ atMs: 2, text: '<html><body><main>Shell</main>' },
				{ atMs: 210, text: `${banner}</body></html>` },
			],
			markers
		);
		expect(streamed).toMatchObject({
			bannerChunkIndex: 1,
			bannerInFirstChunk: false,
			bannerInServerHtml: true,
			bannerMarkupMs: 210,
			chunkCount: 2,
			firstChunkMs: 2,
		});

		const inline = analyzeServerHtmlStream(
			[{ atMs: 3, text: `<html><body>${banner}</body></html>` }],
			markers
		);
		expect(inline.bannerInFirstChunk).toBe(true);
		expect(inline.bannerInServerHtml).toBe(true);
	});

	it('attributes a marker split across chunks to the chunk that completes it', () => {
		const analysis = analyzeServerHtmlStream(
			[
				{ atMs: 1, text: '<div data-testid="consent-ban' },
				{ atMs: 5, text: 'ner-root"></div>' },
			],
			markers
		);
		expect(analysis.bannerInFirstChunk).toBe(false);
		expect(analysis.bannerChunkIndex).toBe(1);
	});

	it('reports no banner and counts UTF-8 bytes', () => {
		const analysis = analyzeServerHtmlStream(
			[{ atMs: 1, text: '<p>é</p>' }],
			markers
		);
		expect(analysis).toMatchObject({
			bannerInFirstChunk: false,
			bannerInServerHtml: false,
			bannerMarkupMs: null,
			firstChunkBytes: 9,
			totalBytes: 9,
		});
		expect(analyzeServerHtmlStream([], markers).firstChunkMs).toBeNull();
	});

	it('matches single-quoted attributes', () => {
		const analysis = analyzeServerHtmlStream(
			[{ atMs: 1, text: "<div data-testid='consent-banner-root'></div>" }],
			markers
		);
		expect(analysis.bannerInServerHtml).toBe(true);
	});
});

describe('readServerHtmlStream', () => {
	const servers: ReturnType<typeof createServer>[] = [];
	afterEach(async () => {
		await Promise.all(
			servers.splice(0).map(
				(server) =>
					new Promise<void>((resolve) => {
						server.close(() => resolve());
					})
			)
		);
	});

	it('keeps server flushes as separate chunks and sends the cookie', async () => {
		let seenCookie: string | undefined;
		let seenEncoding: string | undefined;
		const server = createServer(async (request, response) => {
			seenCookie = request.headers.cookie;
			seenEncoding = request.headers['accept-encoding'];
			response.writeHead(200, { 'content-type': 'text/html' });
			response.write('<html><body><main>Shell</main>');
			await sleep(60);
			response.end(`${banner}</body></html>`);
		});
		servers.push(server);
		await new Promise<void>((resolve) => {
			server.listen(0, '127.0.0.1', resolve);
		});
		const { port } = server.address() as AddressInfo;

		const capture = await readServerHtmlStream(`http://127.0.0.1:${port}/`, {
			cookie: toCookieHeader([{ name: 'c15t', value: 'saved' }]),
		});
		const analysis = analyzeServerHtmlStream(capture.chunks, markers);

		expect(capture.status).toBe(200);
		expect(seenCookie).toBe('c15t=saved');
		expect(seenEncoding).toBe('identity');
		expect(analysis.chunkCount).toBeGreaterThanOrEqual(2);
		expect(analysis.bannerInFirstChunk).toBe(false);
		expect(analysis.bannerInServerHtml).toBe(true);
		expect(analysis.bannerMarkupMs).toBeGreaterThan(
			analysis.firstChunkMs ?? Number.POSITIVE_INFINITY
		);
	});
});

describe('toCookieHeader', () => {
	it('joins cookies and returns undefined for none', () => {
		expect(
			toCookieHeader([
				{ name: 'a', value: '1' },
				{ name: 'b', value: '2' },
			])
		).toBe('a=1; b=2');
		expect(toCookieHeader([])).toBeUndefined();
	});
});
