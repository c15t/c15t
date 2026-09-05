import { describe, expect, it } from 'vitest';

import {
	generateExpandedConsentBannerTemplate,
	generateExpandedConsentDialogTemplate,
	generateExpandedProviderTemplate,
	generateExpandedThemeTemplate,
} from './expanded-components';
import { NEXTJS_CONFIG, REACT_CONFIG } from './framework-config';

describe('expanded component templates', () => {
	it.each(['minimal', 'tailwind', 'dark'] as const)(
		'imports the exported React Theme type for the %s preset in both frameworks',
		(preset) => {
			for (const framework of [REACT_CONFIG, NEXTJS_CONFIG]) {
				const template = generateExpandedThemeTemplate(preset, framework);
				expect(template).toContain(
					"import type { Theme } from 'c15t/react/types';"
				);
				expect(template).not.toContain('c15t/next/types');
			}
		}
	);
	it('generates a React v3 provider with its DevTools adapter', () => {
		const template = generateExpandedProviderTemplate({
			enableDevTools: true,
			enableSSR: false,
			framework: REACT_CONFIG,
			optionsText: 'mode: offline(),',
		});

		expect(template).toContain("from 'c15t/react';");
		expect(template).toContain("import('c15t/react/devtools')");
		expect(template).toContain('<ConsentProvider');
		expect(template).toMatchSnapshot();
	});

	it('generates a Next.js v3 SSR boundary with config', () => {
		const template = generateExpandedProviderTemplate({
			enableDevTools: true,
			enableSSR: true,
			framework: NEXTJS_CONFIG,
			optionsText: "mode: hosted({ url: '/api/c15t' }),",
		});

		expect(template).toContain("from 'c15t/next';");
		expect(template).toContain("import('c15t/next/devtools')");
		expect(template).toContain('<ConsentProvider');
		expect(template).toContain('prefetch: config');
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
