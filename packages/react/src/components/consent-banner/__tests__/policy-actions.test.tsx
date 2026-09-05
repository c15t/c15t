import { defaultTranslationConfig } from '@c15t/core';
import type { ComponentProps, ReactNode } from 'react';
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
	} as unknown as ConsentManagerState;
};

const PolicyTestProvider = ({
	children,
	state,
	providerOverrides,
}: {
	children: ReactNode;
	state: ConsentManagerState;
	providerOverrides?: Partial<
		ComponentProps<typeof ConsentProvider>['options']
	>;
}) => (
	<ConsentProvider
		options={{
			components: providerOverrides?.components,
			mode: offline(),
			persistence: false,
			prefetch: {
				...policyFixture(undefined, {
					categories: state.consentCategories,
					id: 'policy-actions-test',
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
			theme: providerOverrides?.theme,
		}}
	>
		{children}
	</ConsentProvider>
);
const renderPolicyActions = async function renderPolicyActions(
	stateOverrides: Partial<ConsentManagerState> = {},
	renderAction?: ComponentProps<
		typeof ConsentBanner.PolicyActions
	>['renderAction'],
	providerOverrides?: Partial<ComponentProps<typeof ConsentProvider>['options']>
) {
	const state = createMockState(stateOverrides);

	await render(
		<PolicyTestProvider
			state={state}
			providerOverrides={providerOverrides}
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
		</PolicyTestProvider>
	);
};

const renderDefaultPolicyActions = async function renderDefaultPolicyActions(
	stateOverrides: Partial<ConsentManagerState> = {}
) {
	const state = createMockState(stateOverrides);

	await render(
		<PolicyTestProvider state={state}>
			<ConsentBanner.PolicyActions />
		</PolicyTestProvider>
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

	test('host hints cannot remove policy actions', async () => {
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
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="banner-action-customize"]')
		).toBeInTheDocument();
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
				components: {
					button: {
						primary: { className: 'button-primary-marker' },
						secondary: { className: 'button-secondary-marker' },
					},
				},
				theme: {
					consentActions: {
						accept: { variant: 'primary' },
						default: { variant: 'neutral' },
					},
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
});
