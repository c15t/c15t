import type { ConsentStoreState } from '@c15t/core';
import { defaultTranslationConfig } from '@c15t/core';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
	StableConsentStateProvider,
	StableGlobalThemeProvider,
} from '~/__tests__/stable-context-providers';
import { ConsentBanner } from '~/components/consent-banner';
import { GlobalThemeContext as _GlobalThemeContext } from '~/context/theme-context';

const createMockState = function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
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
	} as unknown as ConsentStoreState;
};

const renderBanner = function renderBanner(
	props: ComponentProps<typeof ConsentBanner>,
	stateOverrides: Partial<ConsentStoreState> = {},
	themeSlotOverrides: Record<string, string> = {}
) {
	const state = createMockState(stateOverrides);

	render(
		<StableGlobalThemeProvider
			value={{
				theme: {
					slots: {
						buttonPrimary: 'button-primary-marker',
						buttonSecondary: 'button-secondary-marker',
						...themeSlotOverrides,
					},
				},
			}}
		>
			<StableConsentStateProvider
				value={{
					manager: null,
					state,
					store: {
						getState: () => state,
						setState: () => undefined,
						subscribe: () => () => undefined,
					},
				}}
			>
				<ConsentBanner {...props} />
			</StableConsentStateProvider>
		</StableGlobalThemeProvider>
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

	test('applies the consentBannerTag theme slot to the stock banner tag', async () => {
		renderBanner({}, {}, { consentBannerTag: 'consent-banner-tag-marker' });

		await waitForBanner();

		expect(
			document.querySelector('[data-testid="consent-banner-branding"]')
		)?.toHaveClass('consent-banner-tag-marker');
	});
});
