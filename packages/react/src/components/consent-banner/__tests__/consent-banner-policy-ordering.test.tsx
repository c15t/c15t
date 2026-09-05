import { defaultTranslationConfig } from '@c15t/core';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import type { useConsentManager } from '~/component-hooks/use-consent-manager';
import { ConsentBanner } from '~/components/consent-banner';
import { offline } from '~/transports/offline';

type ConsentManagerState = ReturnType<typeof useConsentManager>;

const createMockState = function createMockState(
	overrides: Partial<ConsentManagerState> = {}
): ConsentManagerState {
	return {
		activeUI: 'banner',
		consentCategories: [
			'necessary',
			'functionality',
			'experience',
			'marketing',
			'measurement',
		],
		consentInfo: null,
		consentTypes: [],
		consents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		getDisplayedConsents: vi.fn(() => []),
		has: vi.fn(),
		hasConsented: vi.fn(),
		model: 'opt-in',
		policyBanner: {
			allowedActions: ['reject', 'accept', 'customize'],
			direction: 'row',
			layout: [['accept', 'reject'], 'customize'],
			primaryActions: ['accept'],
		},
		policyCategories: null,
		policyDialog: {},
		policyScopeMode: null,
		saveConsents: vi.fn().mockResolvedValue(undefined),
		selectedConsents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		setActiveUI: vi.fn(),
		setConsent: vi.fn(),
		setSelectedConsent: vi.fn(),
		translationConfig: defaultTranslationConfig,
		...overrides,
	} as unknown as ConsentManagerState;
};

const renderBanner = function renderBanner(
	props: ComponentProps<typeof ConsentBanner>,
	stateOverrides: Partial<ConsentManagerState> = {},
	componentOverrides: ComponentProps<
		typeof ConsentProvider
	>['options']['components'] = {}
) {
	const state = createMockState(stateOverrides);

	render(
		<ConsentProvider
			options={{
				components: {
					button: {
						primary: { className: 'button-primary-marker' },
						secondary: { className: 'button-secondary-marker' },
					},
					...componentOverrides,
				},
				mode: offline(),
				persistence: false,
				prefetch: {
					...policyFixture(undefined, {
						categories: state.consentCategories,
						id: 'banner-policy-ordering-test',
						model: state.model ?? 'opt-in',
						prompt: 'choice',
						scopeMode: 'permissive',
					}),
					initialDraft: state.consents,
					initialTranslations: {
						language: 'en',
						translations: defaultTranslationConfig.translations.en as never,
					},
				},
				presentation: {
					preferences: state.policyDialog,
					prompt: state.policyBanner,
				},
			}}
		>
			<ConsentBanner {...props} />
		</ConsentProvider>
	);
};

const waitForBanner = async function waitForBanner() {
	await vi.waitFor(
		() => {
			expect(
				document.querySelector('[data-testid="consent-banner-root"]')
			).toBeInTheDocument();
		},
		{ timeout: 3000 }
	);
};

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

	test('component primaryButton overrides host primary actions', async () => {
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

		expect(acceptButton?.className).toContain('button-secondary-marker');
		expect(rejectButton?.className).toContain('button-primary-marker');
	});

	test('host action hints cannot remove policy-required controls', async () => {
		renderBanner(
			{
				layout: ['reject', 'customize', 'accept'],
			},
			{
				policyBanner: {
					allowedActions: ['accept'],
					direction: 'row',
					layout: [['accept']],
					primaryActions: ['accept'],
				},
			}
		);

		await waitForBanner();

		expect(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="consent-banner-reject-button"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="consent-banner-customize-button"]')
		).toBeInTheDocument();
	});

	test('keeps the default layout when policy has hints but no policy layout', async () => {
		renderBanner(
			{},
			{
				policyBanner: {
					allowedActions: ['reject', 'accept', 'customize'],
					direction: 'row',
					primaryActions: ['accept'],
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
			[
				'consent-banner-accept-button',
				'consent-banner-customize-button',
				'consent-banner-reject-button',
			],
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
