import type { ConsentStoreState } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import { createConsentKernel } from 'c15t/v3';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentWidget } from '~/v3/components/consent-widget';
import { ConsentProvider } from '~/v3/provider';

function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
	return {
		activeUI: 'dialog',
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
		policyBanner: {},
		policyDialog: {
			allowedActions: ['reject', 'accept', 'customize'],
			primaryActions: ['customize'],
			layout: ['customize', ['reject', 'accept']],
			direction: 'row',
			uiProfile: 'balanced',
		},
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

function createKernel(state: ConsentStoreState) {
	return createConsentKernel({
		initialConsents: state.consents as never,
		initialJurisdiction: 'GDPR',
		initialShowConsentBanner: true,
		initialTranslations: {
			language: 'en',
			translations: defaultTranslationConfig.translations.en,
		},
		initialPolicy: {
			id: 'test-policy',
			model: 'opt-in',
			consent: {
				categories: state.policyCategories ?? ['*'],
				scopeMode: state.policyScopeMode ?? 'permissive',
			},
			ui: {
				mode: 'dialog',
				banner: state.policyBanner,
				dialog: state.policyDialog,
			},
		} as never,
	});
}

async function renderPolicyActions(
	stateOverrides: Partial<ConsentStoreState> = {}
) {
	const state = createMockState(stateOverrides);
	const kernel = createKernel(state);

	await render(
		<ConsentProvider kernel={kernel} options={{ noStyle: false }}>
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
		</ConsentProvider>
	);
}

async function renderDefaultPolicyActions(
	stateOverrides: Partial<ConsentStoreState> = {}
) {
	const state = createMockState(stateOverrides);
	const kernel = createKernel(state);

	await render(
		<ConsentProvider kernel={kernel} options={{ noStyle: false }}>
			<ConsentWidget.PolicyActions />
		</ConsentProvider>
	);
}

async function renderWidget(
	stateOverrides: Partial<ConsentStoreState> = {},
	themeSlots: Record<string, string> = {}
) {
	const state = createMockState(stateOverrides);
	const kernel = createKernel(state);

	await render(
		<ConsentProvider
			kernel={kernel}
			options={{
				noStyle: false,
				theme: {
					slots: themeSlots,
				},
			}}
		>
			<ConsentWidget hideBranding={false} />
		</ConsentProvider>
	);
}

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
				primaryActions: ['customize'],
				layout: ['customize', ['reject', 'accept']],
				direction: 'row',
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
				primaryActions: ['customize'],
				layout: ['customize', ['reject', 'accept']],
				direction: 'column',
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
			footer?.className.split(/\s+/).filter(Boolean).length
		).toBeGreaterThan(1);
		expect(
			firstGroup?.className.split(/\s+/).filter(Boolean).length
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
				'[data-testid="consent-widget-footer-accept-button"]'
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
});
