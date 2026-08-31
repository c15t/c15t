import type { ConsentStoreState } from '@c15t/core';
import { describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { StableConsentStateProvider } from '~/v3/__tests__/stable-context-providers';

import { useConsentDialogTrigger } from '../use-consent-dialog-trigger';

const createMockState = function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
	return {
		activeUI: 'none',
		consentCategories: ['necessary', 'measurement'],
		consentInfo: null,
		consentTypes: [],
		consents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		policyCategories: null,
		policyScopeMode: null,
		setActiveUI: vi.fn(),
		...overrides,
	} as unknown as ConsentStoreState;
};

const createWrapper = function createWrapper(state: ConsentStoreState) {
	// oxlint-disable-next-line no-shadow -- Local fixture name matches the framework callback contract.
	return function createWrapper({ children }: { children: React.ReactNode }) {
		return (
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
				{children}
			</StableConsentStateProvider>
		);
	};
};

describe('useConsentDialogTrigger', () => {
	test('hides trigger when showWhen is after-consent and no consent exists', async () => {
		const state = createMockState({
			consentInfo: null,
		});

		const { result } = await renderHook(
			() => useConsentDialogTrigger({ showWhen: 'after-consent' }),
			{
				wrapper: createWrapper(state),
			}
		);

		expect(result.current.isVisible).toBe(false);
	});

	test('shows trigger after consent when active UI is none', async () => {
		const state = createMockState({
			activeUI: 'none',
			consentInfo: { time: Date.now() },
		});

		const { result } = await renderHook(
			() => useConsentDialogTrigger({ showWhen: 'after-consent' }),
			{
				wrapper: createWrapper(state),
			}
		);

		expect(result.current.isVisible).toBe(true);
	});

	test('hides trigger while another consent UI is open', async () => {
		const state = createMockState({
			activeUI: 'dialog',
			consentInfo: { time: Date.now() },
		});

		const { result } = await renderHook(
			() => useConsentDialogTrigger({ showWhen: 'always' }),
			{
				wrapper: createWrapper(state),
			}
		);

		expect(result.current.isVisible).toBe(false);
	});

	test('opens dialog and invokes callback when openDialog is called', async () => {
		const setActiveUI = vi.fn();
		const onClick = vi.fn();
		const state = createMockState({
			activeUI: 'none',
			setActiveUI,
		});

		const { result } = await renderHook(
			() =>
				useConsentDialogTrigger({
					onClick,
					showWhen: 'always',
				}),
			{
				wrapper: createWrapper(state),
			}
		);

		result.current.openDialog();

		expect(onClick).toHaveBeenCalledOnce();
		expect(setActiveUI).toHaveBeenCalledWith('dialog');
	});
});
