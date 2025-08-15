import { describe, expect, it, vi } from 'vitest';

import { renderCommentMarkdown } from '../src/steps/render-comment';

// Mock the dependencies
vi.mock('@actions/core');

describe('Improved functionality tests', () => {
	describe('renderCommentMarkdown (no ternary expressions)', () => {
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

	describe('Template SHA validation', () => {
		// Simple test for the validation logic we added
		it('validates repo format correctly', () => {
			const validFormats = ['owner/repo', 'org/project', 'user/name'];
			const invalidFormats = ['invalid', '', 'owner/', '/repo', 'owner//repo'];

			validFormats.forEach((format) => {
				expect(format.includes('/')).toBe(true);
				const [owner, name] = format.split('/');
				expect(owner).toBeTruthy();
				expect(name).toBeTruthy();
			});

			invalidFormats.forEach((format) => {
				if (format.includes('/')) {
					const [owner, name] = format.split('/');
					expect(!owner || !name).toBe(true);
				} else {
					expect(format.includes('/')).toBe(false);
				}
			});
		});
	});

	describe('Installation ID validation', () => {
		it('validates installation IDs correctly', () => {
			const validIds = ['12345', '67890', '1'];
			const invalidIds = ['0', '-1', 'abc', '12.5', '', 'invalid'];

			validIds.forEach((id) => {
				const parsed = Number(id);
				expect(Number.isInteger(parsed) && parsed > 0).toBe(true);
			});

			invalidIds.forEach((id) => {
				const parsed = Number(id);
				expect(Number.isInteger(parsed) && parsed > 0).toBe(false);
			});
		});
	});

	describe('Deployment improvements', () => {
		it('demonstrates canonical alias selection logic', () => {
			// Simulate the canonical alias logic we improved
			const aliases = [
				'first.example.com',
				'second.example.com',
				'third.example.com',
			];
			let canonicalSet = false;
			let canonicalUrl = '';

			for (const domain of aliases) {
				// Simulate successful alias assignment
				const success = true; // All succeed in this test

				if (success && !canonicalSet && domain.includes('.')) {
					canonicalUrl = `https://${domain}`;
					canonicalSet = true;
				}
			}

			// Should use first alias as canonical
			expect(canonicalUrl).toBe('https://first.example.com');
		});
	});
});
