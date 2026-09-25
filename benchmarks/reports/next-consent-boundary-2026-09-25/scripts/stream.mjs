// Raw HTTP/1.1 read of a page: chunk arrival times, where the page content
// and banner markup first appear, and whether the content sits in a hidden
// Suspense segment. Usage: node stream.mjs <url> [cookie]
import http from 'node:http';

export const readStream = (url, cookie = '') =>
	new Promise((resolve, reject) => {
		const start = performance.now();
		const chunks = [];
		const req = http.get(url, { headers: cookie ? { cookie } : {} }, (res) => {
			const ttfb = performance.now() - start;
			res.on('data', (buf) => {
				chunks.push({ at: performance.now() - start, text: buf.toString() });
			});
			res.on('end', () => {
				const html = chunks.map((c) => c.text).join('');
				const find = (needle) => {
					let offset = 0;
					for (const c of chunks) {
						const i = c.text.indexOf(needle);
						if (i >= 0) {
							return { at: c.at, offset: offset + i };
						}
						offset += c.text.length;
					}
					return null;
				};
				const content = find('data-bench-content=""');
				const banner = find('data-testid="consent-banner-root"');
				const hiddenBefore = (pos) =>
					pos ? html.lastIndexOf('<div hidden id="S:', pos.offset) >= 0 : null;
				resolve({
					bannerAt: banner?.at ?? null,
					bannerInFirstChunk: banner ? banner.at === chunks[0].at : false,
					bannerInHiddenSegment: hiddenBefore(banner),
					bytes: html.length,
					chunkCount: chunks.length,
					contentAt: content?.at ?? null,
					contentInFirstChunk: content ? content.at === chunks[0].at : false,
					contentInHiddenSegment: hiddenBefore(content),
					end: performance.now() - start,
					firstChunkAt: chunks[0]?.at ?? null,
					html,
					revealRuntime: html.includes('$RT+300'),
					status: res.statusCode,
					ttfb,
				});
			});
		});
		req.on('error', reject);
	});

if (import.meta.url === `file://${process.argv[1]}`) {
	const [url, cookie] = process.argv.slice(2);
	const r = await readStream(url, cookie);
	const { html: _html, ...rest } = r;
	console.log(JSON.stringify(rest));
}
