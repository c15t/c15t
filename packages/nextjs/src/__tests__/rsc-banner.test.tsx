import { custom } from '@c15t/react';
import type { PolicyRule } from '@c15t/schema/types';
import { renderToString } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

import { ConsentBoundary } from '../boundary';
import { RscConsentBanner } from '../rsc/banner';
import { policyFixture } from './policy-fixture';

const noticeTranslations = {
	language: 'en',
	translations: {
		common: { dismiss: 'Got it' },
		cookieBanner: {
			description: 'Choice description',
			noticeDescription: 'Notice description',
			noticeTitle: 'Notice title',
			title: 'Choice title',
		},
		rights: {
			optOut: 'Do not sell my info',
			preferences: 'Manage my preferences',
		},
	},
} as const;

const renderShell = function renderShell(rule: Partial<PolicyRule>) {
	const config = {
		...policyFixture({}, rule),
		initialTranslations: noticeTranslations,
	};
	return renderToString(
		<ConsentBoundary
			config={JSON.parse(JSON.stringify(config))}
			options={{ disableAnimation: true, mode: custom({ init: vi.fn() }) }}
		>
			<RscConsentBanner
				config={config}
				classNames={{ rightLink: 'link', rights: 'rights' }}
			/>
		</ConsentBoundary>
	);
};

describe('RscConsentBanner server HTML', () => {
	test('a notice renders the uncovered rights before dismiss with notice copy', () => {
		const html = renderShell({ model: 'opt-out', prompt: 'notice' });

		const root = /<[^>]*data-testid="consent-banner-root"[^>]*>/u.exec(
			html
		)?.[0];
		expect(root).toBeDefined();
		expect(root).toContain('data-prompt="notice"');
		expect(root).toContain('data-model="opt-out"');

		expect(html).toContain('Notice title');
		expect(html).toContain('Notice description');
		expect(html).not.toContain('Choice title');

		const optOut = html.indexOf(
			'data-testid="consent-banner-right-link-opt-out"'
		);
		const preferences = html.indexOf(
			'data-testid="consent-banner-right-link-preferences"'
		);
		const dismiss = html.indexOf('data-testid="consent-banner-dismiss-button"');
		expect(optOut).toBeGreaterThan(-1);
		expect(preferences).toBeGreaterThan(optOut);
		expect(dismiss).toBeGreaterThan(preferences);

		expect(html).toContain('data-testid="consent-banner-rights"');
		expect(html).toContain('class="rights"');
		expect(html).toContain('data-right="opt-out"');
		expect(html).toContain('Do not sell my info');
		expect(html).toContain('Manage my preferences');
		expect(html).toContain('data-action="dismiss"');
		expect(html).toContain('>Got it<');
		expect(html).not.toContain('consent-banner-accept-button');
	});

	test('a choice prompt with customize renders no rights group', () => {
		const html = renderShell({ model: 'opt-in', prompt: 'choice' });

		expect(html).toContain('data-prompt="choice"');
		expect(html).toContain('data-model="opt-in"');
		expect(html).toContain('Choice title');
		expect(html).not.toContain('data-testid="consent-banner-rights"');
		expect(html).toContain('data-testid="consent-banner-customize-button"');
		expect(html).toContain('data-action="accept"');
	});
});
