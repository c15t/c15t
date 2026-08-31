import type { ConsentStoreState } from '@c15t/core';
import { defaultTranslationConfig } from '@c15t/core';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import {
	StableConsentStateProvider,
	StableGlobalThemeProvider,
} from '~/__tests__/stable-context-providers';
import { ConsentWidget } from '~/components/consent-widget';
import { GlobalThemeContext as _GlobalThemeContext } from '~/context/theme-context';

const createMockState = function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
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
			allowedActions: ['reject', 'accept', 'customize'],
			direction: 'row',
			layout: ['customize', ['reject', 'accept']],
			primaryActions: ['customize'],
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
	} as unknown as ConsentStoreState;
};

const renderPolicyActions = async function renderPolicyActions(
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
				<ConsentWidget.PolicyActions />
			</StableConsentStateProvider>
		</StableGlobalThemeProvider>
	);
};

const renderWidget = async function renderWidget(
	stateOverrides: Partial<ConsentStoreState> = {},
	themeSlots: Record<string, string> = {}
) {
	const state = createMockState(stateOverrides);

	await render(
		<StableGlobalThemeProvider
			value={{
				noStyle: false,
				theme: {
					slots: themeSlots,
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
				<ConsentWidget hideBranding={false} />
			</StableConsentStateProvider>
		</StableGlobalThemeProvider>
	);
};

describe('ConsentWidget.PolicyActions', () => {
	test('renders policy group ordering', async () => {
		await renderPolicyActions();

		const actions = Array.from(
			document.querySelectorAll<HTMLElement>('[data-testid^="widget-action-"]')
		).map((element) => element.dataset.testid);

		expect(actions).toEqual([
			'widget-action-customize',
			'widget-action-reject',
			'widget-action-accept',
		]);
	});

	test('passes primary action state to custom renderers', async () => {
		await renderPolicyActions();

		expect(
			document.querySelector('[data-testid="widget-action-customize"]')
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
			document.querySelector('[data-testid="widget-action-customize"]')
		).toHaveAttribute('data-consent-action', 'customize');
	});

	test('filters disallowed actions', async () => {
		await renderPolicyActions({
			policyDialog: {
				allowedActions: ['reject', 'customize'],
				direction: 'row',
				layout: ['customize', ['reject', 'accept']],
				primaryActions: ['customize'],
			},
		});

		expect(
			document.querySelector('[data-testid="widget-action-customize"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="widget-action-reject"]')
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-testid="widget-action-accept"]')
		).not.toBeInTheDocument();
	});

	test('applies stacked and fill layout behavior', async () => {
		await renderPolicyActions({
			policyDialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				direction: 'column',
				layout: ['customize', ['reject', 'accept']],
				primaryActions: ['customize'],
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
			document.querySelector('[data-testid="widget-action-customize"]')
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

	test('applies the consentWidgetTag theme slot to the stock widget tag', async () => {
		await renderWidget({}, { consentWidgetTag: 'consent-widget-tag-marker' });

		expect(
			document.querySelector('[data-testid="consent-widget-branding"]')
		)?.toHaveClass('consent-widget-tag-marker');
	});

	test('keeps footer slot classes off footer subgroups', async () => {
		await renderWidget(
			{},
			{
				consentWidgetFooter: 'footer-border-marker border-t pt-6',
				consentWidgetFooterSubGroup: 'footer-subgroup-marker gap-3',
			}
		);

		const footer = document.querySelector(
			'[data-testid="consent-widget-footer"]'
		);
		const subgroup = document.querySelector(
			'[data-testid="consent-widget-footer-sub-group"]'
		);

		expect(footer).toHaveClass('footer-border-marker');
		expect(footer).toHaveClass('border-t');
		expect(subgroup).not.toHaveClass('footer-border-marker');
		expect(subgroup).not.toHaveClass('border-t');
		expect(subgroup).toHaveClass('footer-subgroup-marker');
	});
});
