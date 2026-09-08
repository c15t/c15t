import type { ConsentPresentation } from '@c15t/core';
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

const renderShell = function renderShell(
	rule: Partial<PolicyRule>,
	presentation?: ConsentPresentation,
	language = 'en'
) {
	const config = {
		...policyFixture({}, rule),
		initialTranslations: { ...noticeTranslations, language },
	};
	return renderToString(
		<ConsentBoundary
			config={JSON.parse(JSON.stringify(config))}
			options={{
				disableAnimation: true,
				mode: custom({ init: vi.fn() }),
				presentation,
			}}
		>
			<RscConsentBanner
				config={config}
				classNames={{ rightLink: 'link', rights: 'rights' }}
				presentation={presentation}
			/>
		</ConsentBoundary>
	);
};

const readRoot = function readRoot(html: string) {
	const root = /<[^>]*data-testid="consent-banner-root"[^>]*>/u.exec(html)?.[0];
	expect(root).toBeDefined();
	return root ?? '';
};

const readCard = function readCard(html: string) {
	const card = /<[^>]*data-testid="consent-banner-card"[^>]*>/u.exec(html)?.[0];
	expect(card).toBeDefined();
	return card ?? '';
};

describe('RscConsentBanner server HTML', () => {
	test('a notice renders the opt-out button before an acknowledgement', () => {
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
		const dismiss = html.indexOf('data-testid="consent-banner-dismiss-button"');
		expect(optOut).toBeGreaterThan(-1);
		expect(
			html.match(/data-testid="consent-banner-right-link-opt-out"/gu)
		).toHaveLength(1);
		expect(dismiss).toBeGreaterThan(optOut);
		// One button opens preferences.
		expect(html).not.toContain('consent-banner-right-link-preferences');

		expect(html).toContain('data-testid="consent-banner-rights"');
		expect(html).toContain('class="rights"');
		const optOutButton = /<button[^>]*data-right="opt-out"[^>]*>/u.exec(
			html
		)?.[0];
		expect(optOutButton).toContain('data-action="right"');
		expect(optOutButton).toContain('class="link"');
		// An underlined text control, not a neutral button.
		expect(optOutButton).not.toContain('data-variant=');
		expect(html).toContain('Do not sell my info');
		expect(html).toContain('data-action="dismiss"');
		// Older translations can still supply the dismiss label.
		expect(html).toContain('>Got it<');
		expect(html).not.toContain('>Accept All<');
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

describe('RscConsentBanner surface shape', () => {
	test('a notice resolves to a non-blocking floating card', () => {
		const html = renderShell({ model: 'opt-out', prompt: 'notice' });
		const root = readRoot(html);
		expect(root).toContain('data-variant="floating"');
		expect(root).toContain('data-position="bottom-left"');
		expect(root).not.toContain('data-blocking');
		expect(html).not.toContain('data-testid="consent-banner-overlay"');
		expect(readCard(html)).not.toContain('aria-modal');
		expect(readCard(html)).toContain('role="region"');
	});

	test('a choice resolves to a floating card by default', () => {
		const html = renderShell({ model: 'opt-in', prompt: 'choice' });
		const root = readRoot(html);
		expect(root).toContain('data-variant="floating"');
		expect(root).not.toContain('data-blocking');
		expect(html).not.toContain('data-testid="consent-banner-overlay"');
		// A choice prompt is non-blocking by default, so the card is a labelled
		// region that never claims modal semantics.
		const card = readCard(html);
		expect(card).not.toContain('aria-modal');
		expect(card).toContain('role="region"');
		expect(card).toContain('aria-label=');
	});

	test('a blocking choice is a modal dialog', () => {
		const html = renderShell(
			{ model: 'opt-in', prompt: 'choice' },
			{ prompt: { blocking: true } }
		);
		expect(readRoot(html)).toContain('data-blocking="true"');
		const card = readCard(html);
		expect(card).toContain('aria-modal="true"');
		expect(card).toContain('role="dialog"');
	});

	test('a choice is a region when the host turns the focus trap off', () => {
		const html = renderShell(
			{ model: 'opt-in', prompt: 'choice' },
			{ prompt: { trapFocus: false } }
		);
		const card = readCard(html);
		expect(card).not.toContain('aria-modal');
		expect(card).toContain('role="region"');
	});

	test('a notice resolves to a bottom bar when the host asks for one', () => {
		const html = renderShell(
			{ model: 'opt-out', prompt: 'notice' },
			{ prompt: { variant: 'bar' } }
		);
		const root = readRoot(html);
		expect(root).toContain('data-variant="bar"');
		expect(root).toContain('data-position="bottom"');
		expect(root).not.toContain('data-blocking');
	});

	test('a host wall variant blocks: overlay, modal card, blocking attribute', () => {
		const html = renderShell(
			{ model: 'opt-in', prompt: 'choice' },
			{ prompt: { variant: 'wall' } }
		);
		const root = readRoot(html);
		expect(root).toContain('data-variant="wall"');
		expect(root).toContain('data-blocking="true"');
		expect(html).toContain('data-testid="consent-banner-overlay"');
		const card = readCard(html);
		expect(card).toContain('aria-modal="true"');
		expect(card).toContain('role="dialog"');
	});

	test('a notice never blocks even when the host asks for it', () => {
		const html = renderShell(
			{ model: 'opt-out', prompt: 'notice' },
			{ prompt: { blocking: true } }
		);
		expect(readRoot(html)).not.toContain('data-blocking');
		expect(html).not.toContain('data-testid="consent-banner-overlay"');
	});

	test('a notice bar sits at the bottom edge and a host corner is kept', () => {
		expect(
			readRoot(
				renderShell(
					{ model: 'opt-out', prompt: 'notice' },
					{ prompt: { variant: 'bar' } }
				)
			)
		).toContain('data-position="bottom"');
		expect(
			readRoot(
				renderShell(
					{ model: 'opt-in', prompt: 'choice' },
					{ prompt: { position: 'top-right' } }
				)
			)
		).toContain('data-position="top-right"');
	});

	test('a defaulted corner mirrors for right-to-left text, a host corner does not', () => {
		const mirrored = readRoot(
			renderShell({ model: 'opt-in', prompt: 'choice' }, undefined, 'he')
		);
		expect(mirrored).toContain('dir="rtl"');
		expect(mirrored).toContain('data-position="bottom-right"');

		const kept = readRoot(
			renderShell(
				{ model: 'opt-in', prompt: 'choice' },
				{ prompt: { position: 'top-left' } },
				'he'
			)
		);
		expect(kept).toContain('data-position="top-left"');
	});
});
