import { defaultTranslationConfig } from '@c15t/core';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { useConsentManager } from '~/component-hooks/use-consent-manager';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentProvider } from '~/provider';
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

	return render(
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
					initialConsents: state.consents,
					initialPolicy: {
						consent: {
							categories: state.consentCategories,
							scopeMode: 'permissive',
						},
						id: 'banner-policy-ordering-test',
						model: state.model ?? 'opt-in',
						ui: {
							banner: state.policyBanner,
							dialog: state.policyDialog,
							mode: 'banner',
						},
					},
					initialTranslations: {
						language: 'en',
						translations: defaultTranslationConfig.translations.en as never,
					},
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
		await renderBanner({
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
		await renderBanner({
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
		await renderBanner(
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
		).not.toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="consent-banner-customize-button"]')
		).not.toBeInTheDocument();
	});

	test('groups the default layout when policy has hints but no policy layout', async () => {
		await renderBanner(
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

		// Two sub-groups, not one plus a loose button: the shared default
		// layout is what Svelte, Vue and Astro render, and `space-between`
		// only works when both sides are groups.
		expect(footerGroups).toEqual([
			['consent-banner-reject-button', 'consent-banner-accept-button'],
			['consent-banner-customize-button'],
		]);
	});

	test('shows branding by default and hides it when hideBranding is true', async () => {
		const view = await renderBanner({});

		await waitForBanner();

		expect(
			document.querySelector('[data-testid="consent-banner-branding"]')
		).toBeInTheDocument();

		await view.unmount();

		await renderBanner({ hideBranding: true });

		await waitForBanner();

		expect(
			document.querySelector('[data-testid="consent-banner-branding"]')
		).not.toBeInTheDocument();
	});

	test('applies the banner tag component slot to the stock banner tag', async () => {
		await renderBanner(
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
