import type {
	ConsentKernel,
	SurfacePresentation,
	KernelActiveUI,
} from '@c15t/core';
import { useContext } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { KernelContext } from '~/context';
import { offline } from '~/transports/offline';

import { useHeadlessConsentUI } from '../use-headless-consent-ui';

const createWrapper = function createWrapper(ui: {
	banner?: SurfacePresentation;
	dialog?: SurfacePresentation;
	mode?: KernelActiveUI;
}) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<ConsentProvider
				options={{
					initialUI: ui?.mode,
					mode: offline(),
					persistence: false,
					prefetch: {
						...policyFixture(undefined, {
							categories: undefined,
							id: 'headless-test',
							model: 'opt-in',
							prompt: 'choice',
							scopeMode: 'strict',
						}),
					},
					presentation: { preferences: ui?.dialog, prompt: ui?.banner },
				}}
			>
				{children}
			</ConsentProvider>
		);
	};
};

const useHeadlessWithKernel = function useHeadlessWithKernel() {
	const kernel = useContext(KernelContext) as ConsentKernel;
	const headless = useHeadlessConsentUI();
	return { headless, kernel };
};

describe('useHeadlessConsentUI', () => {
	test('resolves policy-driven action state for banner and dialog', async () => {
		const { result } = await renderHook(() => useHeadlessConsentUI(), {
			wrapper: createWrapper({
				banner: {
					direction: 'row',
					layout: [['reject', 'accept']],
					primaryActions: ['accept'],
					scrollLock: true,
					uiProfile: 'balanced',
				},
				dialog: {
					direction: 'row',
					layout: ['save', ['reject', 'accept']],
					primaryActions: ['save'],
					scrollLock: false,
					uiProfile: 'strict',
				},
				mode: 'banner',
			}),
		});

		await vi.waitFor(() => {
			expect(result.current.banner.isVisible).toBe(true);
		});

		expect(result.current.banner.allowedActions).toEqual([
			'accept',
			'customize',
			'reject',
		]);
		expect(result.current.banner.orderedActions).toEqual(['reject', 'accept']);
		expect(result.current.banner.primaryActions).toEqual(['accept']);
		expect(result.current.banner.actionGroups).toEqual([['reject', 'accept']]);
		expect(result.current.banner.scrollLock).toBe(true);
		expect(result.current.banner.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'equivalent-prominence-overridden' }),
			])
		);

		expect(result.current.dialog.allowedActions).toEqual([
			'reject',
			'accept',
			'save',
		]);
		expect(result.current.dialog.orderedActions).toEqual([
			'save',
			'reject',
			'accept',
		]);
		expect(result.current.dialog.primaryActions).toEqual(['save']);
		expect(result.current.dialog.actionGroups).toEqual([
			['save'],
			['reject', 'accept'],
		]);
		expect(result.current.dialog.scrollLock).toBe(false);
		expect(result.current.dialog.shouldFillActions).toBe(true);
		expect(result.current.dialog.isVisible).toBe(false);
	});

	test('opens dialog when the caller uses the explicit navigation helper', async () => {
		const { result } = await renderHook(() => useHeadlessWithKernel(), {
			wrapper: createWrapper({ mode: 'banner' }),
		});

		await vi.waitFor(() => {
			expect(result.current.headless.banner.isVisible).toBe(true);
		});

		result.current.headless.openDialog();

		await vi.waitFor(() => {
			expect(result.current.kernel.getSnapshot().activeUI).toBe('dialog');
			expect(result.current.headless.dialog.isVisible).toBe(true);
		});
		expect(result.current.kernel.getSnapshot().explicitChoice).toBeNull();
	});

	test('accept saves all consents and closes the UI', async () => {
		const { result } = await renderHook(() => useHeadlessWithKernel(), {
			wrapper: createWrapper({ mode: 'banner' }),
		});

		await vi.waitFor(() => {
			expect(result.current.headless.banner.isVisible).toBe(true);
		});

		await result.current.headless.performBannerAction('accept');

		await vi.waitFor(() => {
			const snapshot = result.current.kernel.getSnapshot();
			expect(snapshot.explicitChoice).not.toBeNull();
			expect(snapshot.effectivePermissions.marketing).toBe(true);
			expect(snapshot.activeUI).toBe('none');
		});
	});

	test('reject keeps only necessary consent', async () => {
		const { result } = await renderHook(() => useHeadlessWithKernel(), {
			wrapper: createWrapper({ mode: 'dialog' }),
		});

		await vi.waitFor(() => {
			expect(result.current.headless.dialog.isVisible).toBe(true);
		});

		await result.current.headless.performDialogAction('reject');

		await vi.waitFor(() => {
			const snapshot = result.current.kernel.getSnapshot();
			expect(snapshot.explicitChoice).not.toBeNull();
			expect(snapshot.effectivePermissions.marketing).toBe(false);
			expect(snapshot.effectivePermissions.necessary).toBe(true);
		});
	});

	test('empty host layouts restore required controls', async () => {
		const { result } = await renderHook(() => useHeadlessConsentUI(), {
			wrapper: createWrapper({
				banner: {
					layout: [],
				},
				dialog: {
					scrollLock: false,
				},
				mode: 'none',
			}),
		});

		expect(result.current.banner.orderedActions).toEqual(['accept', 'reject']);
		expect(result.current.banner.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'required-action-restored' }),
			])
		);
	});
});
