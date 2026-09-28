/**
 * The banner renders the branding logos on every page, so their module ships
 * in the first load. Bundlers keep or drop whole modules, so an icon defined
 * next to the logos ships with them even when only the dialog trigger uses
 * it. The trigger icons live in their own module, imported by the trigger.
 */
import { describe, expect, test } from 'vitest';

// Raw source text, inlined by Vite so the scan works in browser-mode vitest.
const rawSources = import.meta.glob(
	['../**/*.{ts,tsx}', '!../**/__tests__/**', '!../**/*.test.*'],
	{ eager: true, import: 'default', query: '?raw' }
) as Record<string, string>;

describe('branding logo module', () => {
	test('holds only the branding marks', () => {
		const logo = rawSources['../components/shared/ui/logo.tsx'];

		expect(logo).toBeDefined();
		expect(logo).not.toMatch(/FingerprintIcon|SettingsIcon/u);
	});

	test('only the dialog trigger imports the trigger icons', () => {
		const importers = Object.entries(rawSources)
			.filter(([, text]) => /from '[^']*trigger-icons'/u.test(text))
			.map(([file]) => file);

		expect(importers).toEqual(['../components/panel-trigger/atoms/icon.tsx']);
	});
});
