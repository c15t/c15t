import { describe, expect, it } from 'vitest';

import { generateClientConfigContent } from './config';

describe('JavaScript client config', () => {
	it.each(['hosted', 'offline', 'self-hosted', 'custom'])(
		'keeps the legacy %s runtime without mounting v3 DevTools',
		(mode) => {
			const content = generateClientConfigContent(
				mode,
				'https://consent.example.com'
			);

			expect(content).toContain('export const store = runtime.consentStore;');
			expect(content).not.toContain('createDevTools');
			expect(content).not.toContain('@c15t/dev-tools');
		}
	);

	it('matches the legacy hosted config snapshot', () => {
		expect(
			generateClientConfigContent('hosted', 'https://consent.example.com')
		).toMatchSnapshot();
	});
});
