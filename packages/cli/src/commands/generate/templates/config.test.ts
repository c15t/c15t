import { describe, expect, it } from 'vitest';

import { generateClientConfigContent } from './config';

describe('JavaScript client config', () => {
	it.each(['hosted', 'offline', 'self-hosted', 'custom'])(
		'generates a %s kernel without DevTools by default',
		(mode) => {
			const content = generateClientConfigContent(
				mode,
				'https://consent.example.com'
			);

			expect(content).toContain('export const kernel = createConsentKernel(');
			expect(content).not.toContain('createDevTools');
			expect(content).not.toContain('@c15t/dev-tools');
		}
	);

	it('matches the hosted kernel config snapshot', () => {
		expect(
			generateClientConfigContent('hosted', 'https://consent.example.com')
		).toMatchSnapshot();
	});
});
