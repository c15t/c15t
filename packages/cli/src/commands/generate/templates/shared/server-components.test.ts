import { describe, expect, test } from 'vitest';

import { NEXTJS_CONFIG } from './framework-config';
import { generateServerComponent } from './server-components';

describe('generateServerComponent', () => {
	test('resolves backend consent state when SSR is enabled', () => {
		const output = generateServerComponent({
			backendURLValue: 'process.env.NEXT_PUBLIC_C15T_URL!',
			enableSSR: true,
			framework: NEXTJS_CONFIG,
		});

		expect(output).toContain(
			"import { resolveConsent } from 'c15t/next/server';"
		);
		expect(output).toContain('backendURL: process.env.NEXT_PUBLIC_C15T_URL!,');
		expect(output).toContain('<ConsentManagerClient state={state}>');
	});

	test('does not add server resolution when SSR is disabled', () => {
		const output = generateServerComponent({
			backendURLValue: "'https://example.com'",
			enableSSR: false,
			framework: NEXTJS_CONFIG,
		});

		expect(output).not.toContain('resolveConsent');
	});
});
