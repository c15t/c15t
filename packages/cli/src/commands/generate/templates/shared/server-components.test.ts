import { describe, expect, test } from 'vitest';

import { NEXTJS_CONFIG } from './framework-config';
import { generateServerComponent } from './server-components';

describe('generateServerComponent', () => {
	test('prefetches backend consent data when SSR is enabled', () => {
		const output = generateServerComponent({
			backendURLValue: 'process.env.NEXT_PUBLIC_C15T_URL!',
			enableSSR: true,
			framework: NEXTJS_CONFIG,
		});

		expect(output).toContain(
			"import { prefetchInitialConsent } from 'c15t/next/server';"
		);
		expect(output).toContain('backendURL: process.env.NEXT_PUBLIC_C15T_URL!,');
		expect(output).not.toContain('readInitialConsentConfig');
	});

	test('does not add server prefetching when SSR is disabled', () => {
		const output = generateServerComponent({
			backendURLValue: "'https://example.com'",
			enableSSR: false,
			framework: NEXTJS_CONFIG,
		});

		expect(output).not.toContain('prefetchInitialConsent');
	});
});
