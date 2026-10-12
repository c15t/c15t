/**
 * The prebuilt styles read `--c15t-*` custom properties. `ConsentTheme`
 * renders them for a custom theme; the provider no longer generates theme
 * CSS in the browser. Kept in its own file: the provider suite leaves
 * overlapping act() work behind that starves a trailing render of its
 * effects.
 */
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentProvider, ConsentTheme, offline } from '../index';

// Raw source text, inlined by Vite so the scan works in browser-mode vitest.
const rawSources = import.meta.glob(
	[
		'../**/*.{ts,tsx}',
		'!../**/__tests__/**',
		'!../**/*.test.*',
		'!../consent-theme.tsx',
		// The public `@c15t/react/utils` helpers, for server or build-time use.
		'!../utils/theme-utils.ts',
	],
	{ eager: true, import: 'default', query: '?raw' }
) as Record<string, string>;

describe('ConsentProvider theme tokens', () => {
	test('no client module imports the theme generator', () => {
		expect(Object.keys(rawSources)).toContain('../provider.tsx');
		const offending = Object.entries(rawSources)
			.filter(([, text]) =>
				/^import\s+(?!type\b)\{[^}]*\b(?:generateThemeCSS|defaultTheme|themeToVars)\b[^}]*\}\s*from\s+'@c15t\/ui\/theme';/mu.test(
					text
				)
			)
			.map(([file]) => file);

		expect(offending).toEqual([]);
	});

	test('the provider injects no theme style', async () => {
		const { unmount } = await render(
			<ConsentProvider options={{ mode: offline(), persistence: false }}>
				<div data-testid="themed-child" />
			</ConsentProvider>
		);
		expect(document.getElementById('c15t-theme')).toBeNull();
		unmount();
	});

	test('ConsentTheme applies the CSP nonce and the provider applies it to loader scripts', async () => {
		const { unmount } = await render(
			<>
				<ConsentTheme nonce="csp-nonce" />
				<ConsentProvider
					options={{
						enabled: false,
						mode: offline(),
						nonce: 'csp-nonce',
						persistence: false,
						scripts: [
							{
								category: 'marketing',
								id: 'nonce-script',
								src: 'https://example.com/nonce.js',
							},
						],
					}}
				>
					<div />
				</ConsentProvider>
			</>
		);
		await vi.waitFor(() => {
			expect(document.getElementById('c15t-theme')?.nonce).toBe('csp-nonce');
			expect(
				document.head.querySelector<HTMLScriptElement>(
					'script[src="https://example.com/nonce.js"]'
				)?.nonce
			).toBe('csp-nonce');
		});
		unmount();
	});

	test('a ConsentTheme theme replaces the defaults', async () => {
		const theme = { colors: { surface: 'rgb(1, 2, 3)' } };
		const { unmount } = await render(
			<>
				<ConsentTheme theme={theme} />
				<ConsentProvider
					options={{ mode: offline(), persistence: false, theme }}
				>
					<div />
				</ConsentProvider>
			</>
		);
		await vi.waitFor(() => {
			expect(
				getComputedStyle(document.documentElement).getPropertyValue(
					'--c15t-surface'
				)
			).toContain('rgb(1, 2, 3)');
		});
		unmount();
	});

	test('warns in development when theme tokens have no ConsentTheme', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			const { unmount } = await render(
				<ConsentProvider
					options={{
						mode: offline(),
						persistence: false,
						theme: { colors: { surface: 'rgb(1, 2, 3)' } },
					}}
				>
					<div />
				</ConsentProvider>
			);
			await vi.waitFor(() => {
				expect(warn).toHaveBeenCalledWith(
					expect.stringContaining('<ConsentTheme theme={theme} />')
				);
			});
			unmount();
		} finally {
			warn.mockRestore();
		}
	});
});
