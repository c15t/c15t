import type { ConsentStoreState } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentStateContext } from '~/context/consent-manager-context';
import { GlobalThemeContext } from '~/context/theme-context';

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
			layout: ['customize', ['reject', 'accept']],
			direction: 'row',
			uiProfile: 'balanced',
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

async function renderPolicyActions(
	stateOverrides: Partial<ConsentStoreState> = {}
) {
	const state = createMockState(stateOverrides);

	await render(
		<GlobalThemeContext.Provider value={{ noStyle: false }}>
			<ConsentStateContext.Provider
				value={{
					state,
					store: {
						getState: () => state,
						subscribe: () => () => undefined,
						setState: () => undefined,
					},
					manager: null,
				}}
			>
				<ConsentBanner.PolicyActions
					renderAction={(action, props) => (
						<button
							key={props.key}
							data-testid={`banner-action-${action}`}
							data-primary={String(props.isPrimary)}
							data-style={props.style ? 'styled' : 'plain'}
							type="button"
						>
							{action}
						</button>
					)}
				/>
			</ConsentStateContext.Provider>
		</GlobalThemeContext.Provider>
	);
}

async function renderDefaultPolicyActions(
	stateOverrides: Partial<ConsentStoreState> = {}
) {
	const state = createMockState(stateOverrides);

	await render(
		<GlobalThemeContext.Provider value={{ noStyle: false }}>
			<ConsentStateContext.Provider
				value={{
					state,
					store: {
						getState: () => state,
						subscribe: () => () => undefined,
						setState: () => undefined,
					},
					manager: null,
				}}
			>
				<ConsentBanner.PolicyActions />
			</ConsentStateContext.Provider>
		</GlobalThemeContext.Provider>
	);
}

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

	test('filters disallowed actions', async () => {
		await renderPolicyActions({
			policyBanner: {
				allowedActions: ['accept'],
				primaryActions: ['accept'],
				layout: ['customize', ['reject', 'accept']],
				direction: 'row',
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
				primaryActions: ['accept'],
				layout: ['customize', ['reject', 'accept']],
				direction: 'column',
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
			footer?.className.split(/\s+/).filter(Boolean).length
		).toBeGreaterThan(1);
		expect(
			firstGroup?.className.split(/\s+/).filter(Boolean).length
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
});
