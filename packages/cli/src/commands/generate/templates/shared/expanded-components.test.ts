import { describe, expect, it } from 'vitest';
import {
	generateExpandedConsentBannerTemplate,
	generateExpandedConsentDialogTemplate,
} from './expanded-components';
import { NEXTJS_CONFIG, REACT_CONFIG } from './framework-config';

describe('expanded component templates', () => {
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
