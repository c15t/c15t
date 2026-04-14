import type { ConsentStoreState } from 'c15t';
import { describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { ConsentStateContext } from '~/context/consent-manager-context';
import { useConsentDialogTrigger } from '../use-consent-dialog-trigger';

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
		consentCategories: ['necessary', 'measurement'],
		consentTypes: [],
		policyCategories: null,
		policyScopeMode: null,
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
					showWhen: 'always',
					onClick,
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
