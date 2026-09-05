import { defaultTranslationConfig } from '@c15t/core';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import type { useConsentManager } from '~/component-hooks/use-consent-manager';
import { ConsentWidget } from '~/components/consent-widget';
import { offline } from '~/transports/offline';

type ConsentManagerState = ReturnType<typeof useConsentManager>;

const createMockState = function createMockState(
	overrides: Partial<ConsentManagerState> = {}
): ConsentManagerState {
	return {
		activeUI: 'dialog',
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
		policyBanner: {},
		policyCategories: null,
		policyDialog: {
			allowedActions: ['reject', 'accept', 'save'],
			direction: 'row',
			layout: ['save', ['reject', 'accept']],
			primaryActions: ['save'],
			uiProfile: 'balanced',
		},
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
			initialUI: 'dialog',
			mode: offline(),
			persistence: false,
			prefetch: {
				...policyFixture(undefined, {
					categories: state.consentCategories,
					id: 'widget-policy-actions-test',
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
	stateOverrides: Partial<ConsentManagerState> = {}
) {
	const state = createMockState(stateOverrides);

	await render(
		<PolicyTestProvider state={state}>
			<ConsentWidget.PolicyActions
				renderAction={(action, props) => (
					<button
						key={props.key}
						data-testid={`widget-action-${action}`}
						data-consent-action={props.consentAction}
						data-primary={String(props.isPrimary)}
						data-style={props.style ? 'styled' : 'plain'}
						type="button"
					>
						{action}
					</button>
				)}
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
			<ConsentWidget.PolicyActions />
		</PolicyTestProvider>
	);
};

const renderWidget = async function renderWidget(
	stateOverrides: Partial<ConsentManagerState> = {},
	providerOverrides: Partial<
		ComponentProps<typeof ConsentProvider>['options']
	> = {}
) {
	const state = createMockState(stateOverrides);

	await render(
		<PolicyTestProvider
			state={state}
			providerOverrides={providerOverrides}
		>
			<ConsentWidget hideBranding={false} />
		</PolicyTestProvider>
	);
};

describe('ConsentWidget.PolicyActions', () => {
	test('renders policy group ordering', async () => {
		await renderPolicyActions();

		const actions = Array.from(
			document.querySelectorAll<HTMLElement>('[data-testid^="widget-action-"]')
		).map((element) => element.dataset.testid);

		expect(actions).toEqual([
			'widget-action-save',
			'widget-action-reject',
			'widget-action-accept',
		]);
	});

	test('passes primary action state to custom renderers', async () => {
		await renderPolicyActions();

		expect(
			document.querySelector('[data-testid="widget-action-save"]')
		).toHaveAttribute('data-primary', 'true');
		expect(
			document.querySelector('[data-testid="widget-action-accept"]')
		).toHaveAttribute('data-primary', 'false');
	});

	test('passes consentAction to custom renderers', async () => {
		await renderPolicyActions();

		expect(
			document.querySelector('[data-testid="widget-action-accept"]')
		).toHaveAttribute('data-consent-action', 'accept');
		expect(
			document.querySelector('[data-testid="widget-action-save"]')
		).toHaveAttribute('data-consent-action', 'save');
	});

	test('host hints cannot remove persistent preference actions', async () => {
		await renderPolicyActions({
			policyDialog: {
				allowedActions: ['reject', 'save'],
				direction: 'row',
				layout: ['save', ['reject', 'accept']],
				primaryActions: ['save'],
			},
		});

		expect(
			document.querySelector('[data-testid="widget-action-save"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="widget-action-reject"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="widget-action-accept"]')
		).toBeInTheDocument();
	});

	test('applies stacked and fill layout behavior', async () => {
		await renderPolicyActions({
			policyDialog: {
				allowedActions: ['reject', 'accept', 'save'],
				direction: 'column',
				layout: ['save', ['reject', 'accept']],
				primaryActions: ['save'],
				uiProfile: 'strict',
			},
		});

		const footer = document.querySelector(
			'[data-testid="consent-widget-footer"]'
		);
		const firstGroup = document.querySelector(
			'[data-testid="consent-widget-footer-sub-group"]'
		);

		expect(
			footer?.className.split(/\s+/u).filter(Boolean).length
		).toBeGreaterThan(1);
		expect(
			firstGroup?.className.split(/\s+/u).filter(Boolean).length
		).toBeGreaterThan(1);
		expect(
			document.querySelector('[data-testid="widget-action-save"]')
		).toHaveAttribute('data-style', 'styled');
	});

	test('renders stock widget buttons with default translations when renderAction is omitted', async () => {
		await renderDefaultPolicyActions();

		expect(
			document.querySelector(
				'[data-testid="consent-widget-footer-save-button"]'
			)
		).toHaveTextContent(defaultTranslationConfig.translations.en.common.save);
		expect(
			document.querySelector('[data-testid="consent-widget-reject-button"]')
		).toHaveTextContent(
			defaultTranslationConfig.translations.en.common.rejectAll
		);
		expect(
			document.querySelector(
				'[data-testid="consent-widget-footer-accept-all-button"]'
			)
		).toHaveTextContent(
			defaultTranslationConfig.translations.en.common.acceptAll
		);
	});

	test('renders the widget branding tag without the legacy dialog footer wrapper', async () => {
		await renderWidget();

		expect(
			document.querySelector('[data-testid="consent-widget-branding"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="consent-dialog-footer"]')
		).not.toBeInTheDocument();
	});

	test('applies the manager tag component slot to the stock widget tag', async () => {
		await renderWidget(
			{},
			{
				components: {
					tag: {
						manager: { className: 'consent-widget-tag-marker' },
					},
				},
			}
		);

		expect(
			document.querySelector('[data-testid="consent-widget-branding"]')
		)?.toHaveClass('consent-widget-tag-marker');
	});
});
