import { describe, expect, it } from 'vitest';

import { renderCommentMarkdown } from '../src/steps/render-comment';

describe('renderCommentMarkdown', () => {
	it('includes preview table and footer', () => {
		const url = 'https://example.com';
		const out = renderCommentMarkdown(url);
		expect(out).toContain('### Docs Preview');
		expect(out).toContain('[Open Preview](https://example.com)');
		expect(out).toContain('Baked with');
	});

	it('is deterministic for a given seed/url', () => {
		const url = 'https://deterministic.com';
		const a = renderCommentMarkdown(url, { seed: 'seed-123' });
		const b = renderCommentMarkdown(url, { seed: 'seed-123' });
		expect(a).toEqual(b);
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
		expect(fences).toBeGreaterThanOrEqual(2);
	});

	it('renders status field in preview table', () => {
		const md = renderCommentMarkdown('https://example.com', {
			status: 'Skipped',
		});
		expect(md).toMatch(
			/\| \[Open Preview\]\(https:\/\/example\.com\) \| Skipped \|/
		);
	});
});
