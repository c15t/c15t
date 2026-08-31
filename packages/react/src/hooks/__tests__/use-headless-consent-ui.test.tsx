import type { ConsentStoreState } from '@c15t/core';
import { describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { StableConsentStateProvider } from '~/__tests__/stable-context-providers';

import { useHeadlessConsentUI } from '../use-headless-consent-ui';

const createMockState = function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
	return {
		activeUI: 'none',
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
		policyBanner: {},
		policyCategories: null,
		policyDialog: {},
		policyScopeMode: null,
		saveConsents: vi.fn().mockResolvedValue(undefined),
		setActiveUI: vi.fn(),
		...overrides,
	} as unknown as ConsentStoreState;
};

const createWrapper = function createWrapper(state: ConsentStoreState) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
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

describe('useHeadlessConsentUI', () => {
	test('resolves policy-driven action state for banner and dialog', async () => {
		const state = createMockState({
			activeUI: 'banner',
			policyBanner: {
				allowedActions: ['accept', 'reject'],
				direction: 'row',
				layout: [['reject', 'accept']],
				primaryActions: ['accept'],
				scrollLock: true,
				uiProfile: 'balanced',
			},
			policyDialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				direction: 'row',
				layout: ['customize', ['reject', 'accept']],
				primaryActions: ['customize'],
				scrollLock: false,
				uiProfile: 'strict',
			},
		});

		const { result } = await renderHook(() => useHeadlessConsentUI(), {
			wrapper: createWrapper(state),
		});

		expect(result.current.banner.allowedActions).toEqual(['accept', 'reject']);
		expect(result.current.banner.orderedActions).toEqual(['reject', 'accept']);
		expect(result.current.banner.primaryActions).toEqual(['accept']);
		expect(result.current.banner.actionGroups).toEqual([['reject', 'accept']]);
		expect(result.current.banner.scrollLock).toBe(true);
		expect(result.current.banner.hasPolicyHints).toBe(true);
		expect(result.current.banner.isVisible).toBe(true);

		expect(result.current.dialog.allowedActions).toEqual([
			'reject',
			'accept',
			'customize',
		]);
		expect(result.current.dialog.orderedActions).toEqual([
			'customize',
			'reject',
			'accept',
		]);
		expect(result.current.dialog.primaryActions).toEqual(['customize']);
		expect(result.current.dialog.actionGroups).toEqual([
			['customize'],
			['reject', 'accept'],
		]);
		expect(result.current.dialog.scrollLock).toBe(false);
		expect(result.current.dialog.shouldFillActions).toBe(true);
		expect(result.current.dialog.isVisible).toBe(false);
	});

	test('opens dialog when the caller uses the explicit navigation helper', async () => {
		const setActiveUI = vi.fn();
		const saveConsents = vi.fn().mockResolvedValue(undefined);
		const state = createMockState({
			activeUI: 'banner',
			saveConsents,
			setActiveUI,
		});

		const { result } = await renderHook(() => useHeadlessConsentUI(), {
			wrapper: createWrapper(state),
		});

		result.current.openDialog();

		expect(setActiveUI).toHaveBeenCalledWith('dialog');
		expect(saveConsents).not.toHaveBeenCalled();
	});

	test('uses explicit action surface and default ui source', async () => {
		const saveConsents = vi.fn().mockResolvedValue(undefined);
		const state = createMockState({
			activeUI: 'none',
			saveConsents,
		});

		const { result } = await renderHook(() => useHeadlessConsentUI(), {
			wrapper: createWrapper(state),
		});

		await result.current.performAction('accept', { surface: 'dialog' });

		expect(saveConsents).toHaveBeenCalledWith('all', { uiSource: 'dialog' });
	});

	test('supports explicit action helpers with custom ui source', async () => {
		const saveConsents = vi.fn().mockResolvedValue(undefined);
		const state = createMockState({
			activeUI: 'none',
			saveConsents,
		});

		const { result } = await renderHook(() => useHeadlessConsentUI(), {
			wrapper: createWrapper(state),
		});

		await result.current.performDialogAction('reject', {
			uiSource: 'headless-custom-dialog',
		});

		expect(saveConsents).toHaveBeenCalledWith('necessary', {
			uiSource: 'headless-custom-dialog',
		});
	});

	test('saves custom preferences with the dialog ui source by default', async () => {
		const saveConsents = vi.fn().mockResolvedValue(undefined);
		const state = createMockState({
			activeUI: 'none',
			saveConsents,
		});

		const { result } = await renderHook(() => useHeadlessConsentUI(), {
			wrapper: createWrapper(state),
		});

		await result.current.saveCustomPreferences();

		expect(saveConsents).toHaveBeenCalledWith('custom', { uiSource: 'dialog' });
	});

	test('treats empty arrays as absent when calculating policy hints', async () => {
		const state = createMockState({
			policyBanner: {
				allowedActions: [],
				layout: [],
			},
			policyDialog: {
				scrollLock: false,
			},
		});

		const { result } = await renderHook(() => useHeadlessConsentUI(), {
			wrapper: createWrapper(state),
		});

		expect(result.current.banner.hasPolicyHints).toBe(false);
		expect(result.current.dialog.hasPolicyHints).toBe(true);
	});
});
