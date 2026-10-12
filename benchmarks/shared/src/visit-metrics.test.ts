import { describe, expect, it } from 'vitest';

import { analyzeServerHtmlStream, bannerMarkupMarkers } from './html-stream';
import {
	serverHtmlForSampleGroup,
	serverHtmlMetadata,
	summarizeServerHtmlMetrics,
} from './visit-metrics';

const warmRead = analyzeServerHtmlStream(
	[{ atMs: 4, text: '<div data-testid="consent-banner-root"></div>' }],
	bannerMarkupMarkers('consent-banner-root')
);

describe('serverHtmlForSampleGroup', () => {
	it('gives a cold group no server HTML reads, since they were taken warm', () => {
		const reads = serverHtmlForSampleGroup([warmRead, warmRead], 'cold');

		expect(reads).toEqual([]);
		expect(summarizeServerHtmlMetrics(reads)).toEqual([]);
		expect(serverHtmlMetadata(reads)).toEqual({
			bannerInFirstChunk: null,
			bannerInServerHtml: null,
		});
	});

	it('keeps the reads for steady and unlabeled groups', () => {
		expect(serverHtmlForSampleGroup([warmRead], 'steady')).toEqual([warmRead]);
		expect(serverHtmlForSampleGroup([warmRead], null)).toEqual([warmRead]);
	});
});
