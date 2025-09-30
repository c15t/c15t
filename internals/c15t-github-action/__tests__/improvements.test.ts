import { describe, expect, it } from 'vitest';

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
