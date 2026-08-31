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
			layout: ['customize', ['reject', 'accept']],
			primaryActions: ['accept'],
			uiProfile: 'balanced',
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

const renderPolicyActions = async function renderPolicyActions(
	stateOverrides: Partial<ConsentStoreState> = {},
	renderAction?: ComponentProps<
		typeof ConsentBanner.PolicyActions
	>['renderAction'],
	themeOverrides?: Record<string, unknown>
) {
	const state = createMockState(stateOverrides);

	await render(
		<StableGlobalThemeProvider
			value={{
				noStyle: false,
				theme: themeOverrides as never,
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
				<ConsentBanner.PolicyActions
					renderAction={
						renderAction ??
						((action, props) => (
							<button
								key={props.key}
								data-testid={`banner-action-${action}`}
								data-consent-action={props.consentAction}
								data-primary={String(props.isPrimary)}
								data-style={props.style ? 'styled' : 'plain'}
								type="button"
							>
								{action}
							</button>
						))
					}
				/>
			</StableConsentStateProvider>
		</StableGlobalThemeProvider>
	);
};

const renderDefaultPolicyActions = async function renderDefaultPolicyActions(
	stateOverrides: Partial<ConsentStoreState> = {}
) {
	const state = createMockState(stateOverrides);

	await render(
		<StableGlobalThemeProvider value={{ noStyle: false }}>
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
				<ConsentBanner.PolicyActions />
			</StableConsentStateProvider>
		</StableGlobalThemeProvider>
	);
};

describe('ConsentBanner.PolicyActions', () => {
	test('renders policy group ordering', async () => {
		await renderPolicyActions();

		const actions = Array.from(
			document.querySelectorAll<HTMLElement>('[data-testid^="banner-action-"]')
		).map((element) => element.dataset.testid);

		expect(actions).toEqual([
			'banner-action-customize',
			'banner-action-reject',
			'banner-action-accept',
		]);
	});

	test('passes primary action state to custom renderers', async () => {
		await renderPolicyActions();

		expect(
			document.querySelector('[data-testid="banner-action-accept"]')
		).toHaveAttribute('data-primary', 'true');
		expect(
			document.querySelector('[data-testid="banner-action-reject"]')
		).toHaveAttribute('data-primary', 'false');
	});

	test('passes consentAction to custom renderers', async () => {
		await renderPolicyActions();

		expect(
			document.querySelector('[data-testid="banner-action-accept"]')
		).toHaveAttribute('data-consent-action', 'accept');
		expect(
			document.querySelector('[data-testid="banner-action-customize"]')
		).toHaveAttribute('data-consent-action', 'customize');
	});

	test('filters disallowed actions', async () => {
		await renderPolicyActions({
			policyBanner: {
				allowedActions: ['accept'],
				direction: 'row',
				layout: ['customize', ['reject', 'accept']],
				primaryActions: ['accept'],
			},
		});

		expect(
			document.querySelector('[data-testid="banner-action-accept"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="banner-action-reject"]')
		).not.toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="banner-action-customize"]')
		).not.toBeInTheDocument();
	});

	test('applies stacked and fill layout behavior', async () => {
		await renderPolicyActions({
			policyBanner: {
				allowedActions: ['reject', 'accept', 'customize'],
				direction: 'column',
				layout: ['customize', ['reject', 'accept']],
				primaryActions: ['accept'],
				uiProfile: 'strict',
			},
		});

		const footer = document.querySelector(
			'[data-testid="consent-banner-footer"]'
		);
		const firstGroup = document.querySelector(
			'[data-testid="consent-banner-footer-sub-group"]'
		);

		expect(
			footer?.className.split(/\s+/u).filter(Boolean).length
		).toBeGreaterThan(1);
		expect(
			firstGroup?.className.split(/\s+/u).filter(Boolean).length
		).toBeGreaterThan(1);
		expect(
			document.querySelector('[data-testid="banner-action-accept"]')
		).toHaveAttribute('data-style', 'styled');
	});

	test('renders stock banner buttons with default translations when renderAction is omitted', async () => {
		await renderDefaultPolicyActions();

		expect(
			document.querySelector('[data-testid="consent-banner-customize-button"]')
		).toHaveTextContent(
			defaultTranslationConfig.translations.en.common.customize
		);
		expect(
			document.querySelector('[data-testid="consent-banner-reject-button"]')
		).toHaveTextContent(
			defaultTranslationConfig.translations.en.common.rejectAll
		);
		expect(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
		).toHaveTextContent(
			defaultTranslationConfig.translations.en.common.acceptAll
		);
	});

	test('preserves action-specific theming for stock overrides', async () => {
		await renderPolicyActions(
			{
				policyBanner: {
					allowedActions: ['reject', 'accept', 'customize'],
					direction: 'row',
					layout: ['customize', ['reject', 'accept']],
					primaryActions: ['customize'],
				},
			},
			(action, props) => {
				const { key, ...buttonProps } = props;

				switch (action) {
					case 'accept':
						return (
							<ConsentBanner.AcceptButton
								key={key}
								{...buttonProps}
							/>
						);
					case 'reject':
						return (
							<ConsentBanner.RejectButton
								key={key}
								{...buttonProps}
							/>
						);
					case 'customize':
						return (
							<ConsentBanner.CustomizeButton
								key={key}
								{...buttonProps}
							/>
						);
					default: {
						const _exhaustive: never = action;
						throw new Error(`Unhandled banner action: ${_exhaustive}`);
					}
				}
			},
			{
				consentActions: {
					accept: { variant: 'primary' },
					default: { variant: 'neutral' },
				},
				slots: {
					buttonPrimary: 'button-primary-marker',
					buttonSecondary: 'button-secondary-marker',
				},
			}
		);

		expect(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
				?.className
		).toContain('button-primary-marker');
		expect(
			document.querySelector('[data-testid="consent-banner-reject-button"]')
				?.className
		).toContain('button-secondary-marker');
	});

	test('consentActions.primary styles whichever action the policy marks primary', async () => {
		await renderPolicyActions(
			{
				policyBanner: {
					allowedActions: ['reject', 'accept', 'customize'],
					direction: 'row',
					layout: ['customize', ['reject', 'accept']],
					primaryActions: ['customize'],
				},
			},
			(action, props) => {
				const { key, ...buttonProps } = props;

				switch (action) {
					case 'accept':
						return (
							<ConsentBanner.AcceptButton
								key={key}
								{...buttonProps}
							/>
						);
					case 'reject':
						return (
							<ConsentBanner.RejectButton
								key={key}
								{...buttonProps}
							/>
						);
					case 'customize':
						return (
							<ConsentBanner.CustomizeButton
								key={key}
								{...buttonProps}
							/>
						);
					default: {
						const _exhaustive: never = action;
						throw new Error(`Unhandled banner action: ${_exhaustive}`);
					}
				}
			},
			{
				consentActions: {
					default: { variant: 'neutral' },
					primary: { variant: 'primary' },
				},
				slots: {
					buttonPrimary: 'button-primary-marker',
					buttonSecondary: 'button-secondary-marker',
				},
			}
		);

		// The policy marks customize as primary, so the theme's `primary`
		// treatment lands there — not on accept.
		expect(
			document.querySelector('[data-testid="consent-banner-customize-button"]')
				?.className
		).toContain('button-primary-marker');
		expect(
			document.querySelector('[data-testid="consent-banner-accept-button"]')
				?.className
		).toContain('button-secondary-marker');
		expect(
			document.querySelector('[data-testid="consent-banner-reject-button"]')
				?.className
		).toContain('button-secondary-marker');
	});
});
