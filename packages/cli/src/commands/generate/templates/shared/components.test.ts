import { describe, expect, it } from 'vitest';

import { generateConsentComponent } from './components';

describe('consent component template', () => {
	it('generates a React v3 provider with its framework DevTools adapter', () => {
		const template = generateConsentComponent({
			devToolsImportSource: 'c15t/react/v3/devtools',
			docsSlug: 'react',
			enableDevTools: true,
			importSource: 'c15t/react/v3',
			optionsText: "mode: 'offline',",
			useClientDirective: true,
		});

		expect(template).toContain("from 'c15t/react/v3';");
		expect(template).toContain("from 'c15t/react/v3/devtools';");
		expect(template).toContain('<ConsentProvider options=');
		expect(template).not.toContain('ConsentManagerProvider');
		expect(template).toMatchSnapshot();
	});

	it('generates the canonical Next.js v3 SSR boundary', () => {
		const template = generateConsentComponent({
			defaultExport: true,
			devToolsImportSource: 'c15t/next/v3/devtools',
			docsSlug: 'next',
			enableDevTools: true,
			importSource: 'c15t/next/v3',
			optionsText: "mode: 'hosted',\n\t\t\t\tbackendURL: '/api/c15t',",
			prefetch: {
				backendURLValue: "'/api/c15t'",
				configImportSource: 'c15t/next/v3/server',
			},
			selectedScripts: ['google-tag-manager'],
			useClientDirective: true,
		});

		expect(template).toContain("from 'c15t/next/v3/devtools';");
		expect(template).toContain('<ConsentBoundary');
		expect(template).toContain('config={config}');
		expect(template).not.toContain('ConsentProvider');
		expect(template).not.toContain("mode: 'hosted'");
		expect(template).toMatchSnapshot();
	});
});
