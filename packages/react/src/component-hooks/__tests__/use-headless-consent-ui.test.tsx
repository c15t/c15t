import type { ConsentKernel, ResolvedPolicy } from '@c15t/core';
import { useContext } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { KernelContext } from '~/context';
import { ConsentProvider } from '~/provider';
import { offline } from '~/transports/offline';

import { useHeadlessConsentUI } from '../use-headless-consent-ui';

const createWrapper = function createWrapper(ui: ResolvedPolicy['ui']) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<ConsentProvider
				options={{
					mode: offline(),
					persistence: false,
					prefetch: {
						initialPolicy: {
							id: 'headless-test',
							model: 'opt-in',
							ui,
						},
					},
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
					allowedActions: ['accept', 'reject'],
					direction: 'row',
					layout: [['reject', 'accept']],
					primaryActions: ['accept'],
					scrollLock: true,
					uiProfile: 'balanced',
				},
				dialog: {
					allowedActions: ['reject', 'accept', 'customize'],
					direction: 'row',
					layout: ['customize', ['reject', 'accept']],
					primaryActions: ['customize'],
					scrollLock: false,
					uiProfile: 'strict',
				},
				mode: 'banner',
			}),
		});

		await vi.waitFor(() => {
			expect(result.current.banner.isVisible).toBe(true);
		});

		expect(result.current.banner.allowedActions).toEqual(['accept', 'reject']);
		expect(result.current.banner.orderedActions).toEqual(['reject', 'accept']);
		expect(result.current.banner.primaryActions).toEqual(['accept']);
		expect(result.current.banner.actionGroups).toEqual([['reject', 'accept']]);
		expect(result.current.banner.scrollLock).toBe(true);
		expect(result.current.banner.hasPolicyHints).toBe(true);

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
		expect(result.current.kernel.getSnapshot().hasConsented).toBe(false);
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
			expect(snapshot.hasConsented).toBe(true);
			expect(snapshot.consents.marketing).toBe(true);
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
			expect(snapshot.hasConsented).toBe(true);
			expect(snapshot.consents.marketing).toBe(false);
			expect(snapshot.consents.necessary).toBe(true);
		});
	});

	test('treats empty arrays as absent when calculating policy hints', async () => {
		const { result } = await renderHook(() => useHeadlessConsentUI(), {
			wrapper: createWrapper({
				banner: {
					allowedActions: [],
					layout: [],
				},
				dialog: {
					scrollLock: false,
				},
				mode: 'none',
			}),
		});

		await vi.waitFor(() => {
			expect(result.current.dialog.hasPolicyHints).toBe(true);
		});
		expect(result.current.banner.hasPolicyHints).toBe(false);
	});
});
