import { describe, expect, it } from 'vitest';

import {
	generateExpandedConsentBannerTemplate,
	generateExpandedConsentDialogTemplate,
	generateExpandedProviderTemplate,
} from './expanded-components';
import { NEXTJS_CONFIG, REACT_CONFIG } from './framework-config';

describe('expanded component templates', () => {
	it('generates a React v3 provider with its DevTools adapter', () => {
		const template = generateExpandedProviderTemplate({
			enableDevTools: true,
			enableSSR: false,
			framework: REACT_CONFIG,
			optionsText: "mode: 'offline',",
		});

		expect(template).toContain("from 'c15t/react/v3';");
		expect(template).toContain("from 'c15t/react/v3/devtools';");
		expect(template).toContain('<ConsentProvider');
		expect(template).toMatchSnapshot();
	});

	it('generates a Next.js v3 SSR boundary with config', () => {
		const template = generateExpandedProviderTemplate({
			backendURLValue: "'/api/c15t'",
			enableDevTools: true,
			enableSSR: true,
			framework: NEXTJS_CONFIG,
			optionsText: "mode: 'hosted',\n\t\t\t\tbackendURL: '/api/c15t',",
		});

		expect(template).toContain("from 'c15t/next/v3';");
		expect(template).toContain("from 'c15t/next/v3/devtools';");
		expect(template).toContain('<ConsentBoundary');
		expect(template).toContain('config={config}');
		expect(template).not.toContain("mode: 'hosted'");
		expect(template).toMatchSnapshot();
	});

	it('generates a policy-aware banner template', () => {
		const template = generateExpandedConsentBannerTemplate(REACT_CONFIG);

		expect(template).toContain('<ConsentBanner.PolicyActions />');
		expect(template).toContain(
			'Pass renderAction to customize mapping. Stock c15t buttons render by default.'
		);
		expect(template).not.toContain('useHeadlessConsentUI');
		expect(template).not.toContain('actionGroups.map');
	});

	it('generates a policy-aware dialog template', () => {
		const template = generateExpandedConsentDialogTemplate(NEXTJS_CONFIG);

		expect(template).toContain("import { useState } from 'react';");
		expect(template).toContain('<ConsentWidget.Root>');
		expect(template).toContain('<ConsentWidget.AccordionItems />');
		expect(template).toContain('<ConsentWidget.PolicyActions />');
		expect(template).toContain(
			'Pass renderAction to customize mapping. Stock c15t buttons render by default.'
		);
		expect(template).toContain('<ConsentDialog.Footer />');
		expect(template).not.toContain('useHeadlessConsentUI');
		expect(template).not.toContain('actionGroups.map');
	});
});
