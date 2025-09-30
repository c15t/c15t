import { describe, expect, it, vi } from 'vitest';

import { renderCommentMarkdown } from '../src/steps/render-comment';

const PREVIEW_TABLE_REGEX =
	/\| \[Open Preview\]\(https:\/\/example\.com\) \| Skipped \|/;

describe('renderCommentMarkdown', () => {
	it('includes preview table and footer', () => {
		const url = 'https://example.com';
		const out = renderCommentMarkdown(url);
		expect(out).toContain('### Docs Preview');
		expect(out).toContain('[Open Preview](https://example.com)');
		expect(out).toContain('Baked with');
	});

	it('is deterministic for a given seed/url', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
		const url = 'https://deterministic.com';
		const a = renderCommentMarkdown(url, { seed: 'seed-123' });
		const b = renderCommentMarkdown(url, { seed: 'seed-123' });
		expect(a).toEqual(b);
		vi.useRealTimers();
	});

	it('includes first time contributor message when flagged', () => {
		const url = 'https://example.com';
		const out = renderCommentMarkdown(url, { firstContribution: true });
		expect(out).toContain('Your first c15t commit');
	});

	it('debug renders multiple ascii blocks', () => {
		const url = 'https://example.com';
		const out = renderCommentMarkdown(url, { debug: true });
		// Expect multiple fenced blocks
		const fences = out.split('```').length - 1;
		expect(fences).toBeGreaterThanOrEqual(4);
	});

	it('renders status field in preview table', () => {
		const md = renderCommentMarkdown('https://example.com', {
			status: 'Skipped',
		});
		expect(md).toMatch(PREVIEW_TABLE_REGEX);
	});

	it('uses deterministic seed selection without ternary', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

		const withSeed = renderCommentMarkdown('https://example.com', {
			seed: 'test-seed',
		});
		const withoutSeed = renderCommentMarkdown('https://example.com');

		// Both should work without ternary expressions
		expect(typeof withSeed).toBe('string');
		expect(typeof withoutSeed).toBe('string');
		expect(withSeed).toContain('### Docs Preview');
		expect(withoutSeed).toContain('### Docs Preview');

		vi.useRealTimers();
	});

	it('handles status assignment without ternary', () => {
		const withStatus = renderCommentMarkdown('https://example.com', {
			status: 'Custom Status',
		});
		const withoutStatus = renderCommentMarkdown('https://example.com');

		expect(withStatus).toContain('Custom Status');
		expect(withoutStatus).toContain('Ready'); // default
	});

	it('handles first contribution without ternary expressions', () => {
		const firstTime = renderCommentMarkdown('https://example.com', {
			firstContribution: true,
		});
		const regular = renderCommentMarkdown('https://example.com', {
			firstContribution: false,
		});

		expect(firstTime).toContain('Your first c15t commit');
		expect(regular).not.toContain('Your first c15t commit');
	});
});
