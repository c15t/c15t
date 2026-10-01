import { describe, expect, it } from 'vitest';

import {
	generateClientConfigContent,
	getClientConfigDependencies,
} from './config';

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

	it('offline kernel resolves bundled copy for a language set later', () => {
		const content = generateClientConfigContent('offline');
		expect(content).toContain(
			"import { baseTranslations } from '@c15t/translations/all';"
		);
		expect(content).toMatch(
			/translationsFor: \(language\) =>\s+resolveLocalTranslations\(language, baseTranslations\)/u
		);
	});

	it.each([
		['offline', ['@c15t/translations']],
		[null, ['@c15t/translations']],
		['hosted', []],
		['self-hosted', []],
		['custom', []],
	])('the %s config installs %j next to c15t', (mode, dependencies) => {
		expect(getClientConfigDependencies(mode)).toEqual(dependencies);
	});
});
