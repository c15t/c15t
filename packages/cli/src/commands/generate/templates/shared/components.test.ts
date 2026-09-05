import { describe, expect, it } from 'vitest';

import { generateConsentComponent } from './components';

describe('consent component template', () => {
	it.each(['c15t/react', 'c15t/next'])(
		'passes generated theme and component overrides to the %s prebuilt provider',
		(importSource) => {
			const template = generateConsentComponent({
				importSource,
				includeTheme: true,
				optionsText: 'mode: offline(),',
			});
			expect(template).toContain(
				"import { components, theme } from './theme';"
			);
			expect(template).toMatch(
				/options=\{\{[\s\S]*?\btheme,[\s\S]*?\bcomponents,/u
			);
		}
	);
	it('generates a React v3 provider with its framework DevTools adapter', () => {
		const template = generateConsentComponent({
			devToolsImportSource: 'c15t/react/devtools',
			docsSlug: 'react',
			enableDevTools: true,
			importSource: 'c15t/react',
			optionsText: 'mode: offline(),',
			useClientDirective: true,
		});

		expect(template).toContain("from 'c15t/react';");
		expect(template).toContain("import('c15t/react/devtools')");
		expect(template).toContain('import.meta.env.DEV');
		expect(template).not.toContain('process.env');
		expect(template).toContain('<ConsentProvider options=');
		expect(template).not.toContain('ConsentManagerProvider');
		expect(template).toMatchSnapshot();
	});

	it('generates the canonical Next.js v3 SSR boundary', () => {
		const template = generateConsentComponent({
			defaultExport: true,
			devToolsImportSource: 'c15t/next/devtools',
			docsSlug: 'next',
			enableDevTools: true,
			importSource: 'c15t/next',
			optionsText: "mode: hosted({ url: '/api/c15t' }),",
			selectedScripts: ['google-tag-manager'],
			ssrDataOption: true,
			useClientDirective: true,
		});

		expect(template).toContain("import('c15t/next/devtools')");
		expect(template).toContain('<ConsentProvider');
		expect(template).toContain('prefetch: config');
		expect(template).not.toContain("mode: 'hosted'");
		expect(template).toMatchSnapshot();
	});
});
