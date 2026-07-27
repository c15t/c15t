import { describe, expect, test } from 'vitest';
import type { YouTubeEmbedProps } from '../youtube-embed';

const videoIdProps = {
	title: 'Product video',
	videoId: 'abc123',
	start: 15,
	params: { controls: true },
} satisfies YouTubeEmbedProps;

const srcProps = {
	title: 'Migrated video',
	src: 'https://www.youtube-nocookie.com/embed/abc123',
} satisfies YouTubeEmbedProps;

// @ts-expect-error A YouTube source is required.
const missingSourceProps: YouTubeEmbedProps = {
	title: 'Missing source',
};

const competingSources = {
	title: 'Competing sources',
	videoId: 'abc123',
	src: 'https://www.youtube.com/embed/abc123',
};

// @ts-expect-error videoId and src are mutually exclusive.
const competingSourceProps: YouTubeEmbedProps = competingSources;

const srcWithBuilderOptions = {
	title: 'Migrated video',
	src: 'https://www.youtube.com/embed/abc123',
	start: 15,
};

// @ts-expect-error Builder options are unavailable when src is provided.
const invalidSrcProps: YouTubeEmbedProps = srcWithBuilderOptions;

describe('YouTubeEmbedProps', () => {
	test('accepts exactly one source mode', () => {
		expect(videoIdProps.videoId).toBe('abc123');
		expect(srcProps.src).toContain('youtube-nocookie.com');
		expect(missingSourceProps.title).toBe('Missing source');
		expect(competingSourceProps.title).toBe('Competing sources');
		expect(invalidSrcProps.title).toBe('Migrated video');
	});
});
