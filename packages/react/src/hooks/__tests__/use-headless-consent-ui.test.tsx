import type { ConsentStoreState } from 'c15t';
import { describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { ConsentStateContext } from '~/context/consent-manager-context';
import { useHeadlessConsentUI } from '../use-headless-consent-ui';

function createMockState(
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState {
	return {
		activeUI: 'none',
		consents: {
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
		policyDialog: {},
		saveConsents: vi.fn().mockResolvedValue(undefined),
		setActiveUI: vi.fn(),
		...overrides,
	} as unknown as ConsentStoreState;
}

function createWrapper(state: ConsentStoreState) {
	return ({ children }: { children: React.ReactNode }) => (
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
			{children}
		</ConsentStateContext.Provider>
	);
}

describe('useHeadlessConsentUI', () => {
	test('resolves policy-driven action state for banner and dialog', async () => {
		const state = createMockState({
			activeUI: 'banner',
			policyBanner: {
				allowedActions: ['accept', 'reject'],
				primaryAction: 'accept',
				layout: [['reject', 'accept']],
				direction: 'row',
				uiProfile: 'balanced',
				scrollLock: true,
			},
			policyDialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryAction: 'customize',
				layout: ['customize', ['reject', 'accept']],
				direction: 'row',
				uiProfile: 'strict',
				scrollLock: false,
			},
		});

		const { result } = await renderHook(() => useHeadlessConsentUI(), {
			wrapper: createWrapper(state),
		});

		expect(result.current.banner.allowedActions).toEqual(['accept', 'reject']);
		expect(result.current.banner.orderedActions).toEqual(['reject', 'accept']);
		expect(result.current.banner.primaryAction).toBe('accept');
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
		expect(result.current.dialog.primaryAction).toBe('customize');
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
			setActiveUI,
			saveConsents,
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
