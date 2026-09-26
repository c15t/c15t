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

	test('passes the pending consent state instead of awaiting it', () => {
		const output = generateServerComponent({
			backendURLValue: 'process.env.NEXT_PUBLIC_C15T_URL!',
			enableSSR: true,
			framework: NEXTJS_CONFIG,
		});

		// An async wrapper that awaits resolution holds the whole response
		// until the consent backend answers.
		expect(output).toContain('export function ConsentManager(');
		expect(output).not.toContain('async function');
		expect(output).toContain('const state = resolveConsent({');
		expect(output).not.toMatch(/await\s+resolveConsent/u);
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
