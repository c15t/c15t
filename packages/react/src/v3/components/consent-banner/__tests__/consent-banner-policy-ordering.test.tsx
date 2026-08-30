import type { ConsentStoreState } from '@c15t/core';
import { defaultTranslationConfig } from '@c15t/core';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentBanner } from '~/v3/components/consent-banner';
import { ConsentProvider } from '~/v3/provider';

function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
	return {
		activeUI: 'banner',
		model: 'opt-in',
		translationConfig: defaultTranslationConfig,
		consents: {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: false,
		},
		selectedConsents: {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: false,
		},
		consentInfo: null,
		consentCategories: [
			'necessary',
			'functionality',
			'experience',
			'marketing',
			'measurement',
		],
		consentTypes: [],
		policyCategories: null,
		policyScopeMode: null,
		policyBanner: {
			allowedActions: ['reject', 'accept', 'customize'],
			primaryActions: ['accept'],
			layout: [['accept', 'reject'], 'customize'],
			direction: 'row',
		},
		policyDialog: {},
		saveConsents: vi.fn().mockResolvedValue(undefined),
		setConsent: vi.fn(),
		setSelectedConsent: vi.fn(),
		setActiveUI: vi.fn(),
		has: vi.fn(),
		hasConsented: vi.fn(),
		getDisplayedConsents: vi.fn(() => []),
		...overrides,
	} as unknown as ConsentStoreState;
}

function renderBanner(
	props: ComponentProps<typeof ConsentBanner>,
	stateOverrides: Partial<ConsentStoreState> = {},
	componentOverrides: ComponentProps<
		typeof ConsentProvider
	>['options']['components'] = {}
) {
	const state = createMockState(stateOverrides);

	render(
		<ConsentProvider
			options={{
				mode: 'offline',
				persistence: false,
				components: {
					button: {
						primary: { className: 'button-primary-marker' },
						secondary: { className: 'button-secondary-marker' },
					},
					...componentOverrides,
				},
				prefetch: {
					initialConsents: state.consents,
					initialTranslations: {
						language: 'en',
						translations: defaultTranslationConfig.translations.en as never,
					},
					initialPolicy: {
						id: 'banner-policy-ordering-test',
						model: state.model,
						consent: {
							categories: state.consentCategories,
							scopeMode: 'permissive',
						},
						ui: {
							mode: 'banner',
							banner: state.policyBanner,
							dialog: state.policyDialog,
						},
					},
				},
			}}
		>
			<ConsentBanner {...props} />
		</ConsentProvider>
	);
}

async function waitForBanner() {
	await vi.waitFor(
		() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).toBeInTheDocument();
		},
		{ timeout: 3000 }
	);
}

describe('ConsentBanner policy ordering', () => {
	test('prefers local layout over policy layout', async () => {
		renderBanner({
			layout: ['customize', ['reject', 'accept']],
		});

		await waitForBanner();

		const buttons = Array.from(
			document.querySelectorAll<HTMLButtonElement>(
				'[data-testid="consent-banner-footer"] button'
			)
		).map((button) => button.dataset.testid);

		expect(buttons).toEqual([
			'consent-banner-customize-button',
			'consent-banner-reject-button',
			'consent-banner-accept-button',
		]);
	});

	test('uses policy primary actions before the primaryButton prop', async () => {
		renderBanner({
			primaryButton: 'reject',
		});

		await waitForBanner();

		const acceptButton = document.querySelector<HTMLButtonElement>(
			'[data-testid="consent-banner-accept-button"]'
		);
		const rejectButton = document.querySelector<HTMLButtonElement>(
			'[data-testid="consent-banner-reject-button"]'
		);

		expect(acceptButton?.className).toContain('button-primary-marker');
		expect(rejectButton?.className).toContain('button-secondary-marker');
	});

	test('filters out actions disallowed by policy even when local layout includes them', async () => {
		renderBanner(
			{
				layout: ['reject', 'customize', 'accept'],
			},
			{
				policyBanner: {
					allowedActions: ['accept'],
					primaryActions: ['accept'],
					layout: [['accept']],
					direction: 'row',
				},
			}
		);

		await waitForBanner();

		expect(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="consent-banner-reject-button"]')
		).not.toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="consent-banner-customize-button"]')
		).not.toBeInTheDocument();
	});

	test('keeps the default layout when policy has hints but no policy layout', async () => {
		renderBanner(
			{},
			{
				policyBanner: {
					allowedActions: ['reject', 'accept', 'customize'],
					primaryActions: ['accept'],
					direction: 'row',
					scrollLock: true,
				},
			}
		);

		await waitForBanner();

		const footerGroups = Array.from(
			document.querySelectorAll(
				'[data-testid="consent-banner-footer-sub-group"]'
			)
		).map((group) =>
			Array.from(group.querySelectorAll<HTMLButtonElement>('button')).map(
				(button) => button.dataset.testid
			)
		);

		expect(footerGroups).toEqual([
			['consent-banner-reject-button', 'consent-banner-accept-button'],
		]);
		expect(
			document.querySelector('[data-testid="consent-banner-customize-button"]')
		).toBeInTheDocument();
	});

	test('shows branding by default and hides it when hideBranding is true', async () => {
		renderBanner({});

		await waitForBanner();

		expect(
			document.querySelector('[data-testid="consent-banner-branding"]')
		).toBeInTheDocument();

		document.body.innerHTML = '';

		renderBanner({ hideBranding: true });

		await waitForBanner();

		expect(
			document.querySelector('[data-testid="consent-banner-branding"]')
		).not.toBeInTheDocument();
	});

	test('applies the banner tag component slot to the stock banner tag', async () => {
		renderBanner(
			{},
			{},
			{ tag: { banner: { className: 'consent-banner-tag-marker' } } }
		);

		await waitForBanner();

		expect(
			document.querySelector('[data-testid="consent-banner-branding"]')
		)?.toHaveClass('consent-banner-tag-marker');
	});
});
