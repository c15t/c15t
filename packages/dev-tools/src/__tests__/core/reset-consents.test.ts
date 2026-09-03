import { createConsentKernel } from '@c15t/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetAllConsents } from '../../core/reset-consents';
import type { StateManager } from '../../core/state-manager';

const createMockStateManager = function createMockStateManager(): StateManager {
	return {
		addEvent: vi.fn(),
		clearEventLog: vi.fn(),
		destroy: vi.fn(),
		getState: vi.fn(() => ({
			activeTab: 'consents' as const,
			eventLog: [],
			isConnected: true,
			isOpen: false,
			maxEventLogSize: 100,
			position: 'bottom-right' as const,
		})),
		setActiveTab: vi.fn(),
		setConnected: vi.fn(),
		setOpen: vi.fn(),
		setPosition: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		toggle: vi.fn(),
	};
};

const createKernel = function createKernel() {
	const kernel = createConsentKernel({
		initialConsents: { marketing: true, measurement: true },
		initialHasConsented: true,
		initialSubjectId: 'subject-1',
	});
	const init = vi
		.spyOn(kernel.commands, 'init')
		.mockResolvedValue({ ok: true });
	return { init, kernel };
};

describe('resetAllConsents', () => {
	let mockLocalStorage: Record<string, string>;

	beforeEach(() => {
		mockLocalStorage = {};
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
			removeItem: vi.fn((key: string) => {
				Reflect.deleteProperty(mockLocalStorage, key);
			}),
			setItem: vi.fn((key: string, value: string) => {
				mockLocalStorage[key] = value;
			}),
		});
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => '',
			set: vi.fn(),
		});
	});

	it('resets kernel consent state and re-runs init', async () => {
		const { init, kernel } = createKernel();

		await resetAllConsents(kernel);

		expect(kernel.getSnapshot()).toMatchObject({
			consents: {
				marketing: false,
				measurement: false,
				necessary: true,
			},
			hasConsented: false,
			subjectId: null,
		});
		expect(init).toHaveBeenCalledOnce();
	});

	it('clears consent cookies', async () => {
		const cookiesSet: string[] = [];
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => cookiesSet.join('; '),
			set: (value: string) => cookiesSet.push(value),
		});
		const { kernel } = createKernel();

		await resetAllConsents(kernel);

		expect(cookiesSet.some((cookie) => cookie.startsWith('c15t='))).toBe(true);
		expect(
			cookiesSet.some((cookie) => cookie.startsWith('euconsent-v2='))
		).toBe(true);
		expect(
			cookiesSet.every((cookie) => cookie.includes('expires=Thu, 01 Jan 1970'))
		).toBe(true);
	});

	it('removes current and legacy storage entries', async () => {
		const { kernel } = createKernel();

		await resetAllConsents(kernel);

		expect(localStorage.removeItem).toHaveBeenCalledWith('c15t');
		expect(localStorage.removeItem).toHaveBeenCalledWith(
			'privacy-consent-storage'
		);
		expect(localStorage.removeItem).toHaveBeenCalledWith(
			'c15t-v3-pending-consent-saves:v1'
		);
		expect(localStorage.removeItem).toHaveBeenCalledWith('euconsent-v2');
	});

	it('logs the reset when a state manager is supplied', async () => {
		const { kernel } = createKernel();
		const stateManager = createMockStateManager();

		await resetAllConsents(kernel, stateManager);

		expect(stateManager.addEvent).toHaveBeenCalledWith({
			message: 'All consents reset (storage cleared)',
			type: 'consent_reset',
		});
	});

	it('continues when localStorage is unavailable', async () => {
		vi.stubGlobal('localStorage', {
			removeItem: vi.fn(() => {
				throw new Error('localStorage not available');
			}),
		});
		const { kernel } = createKernel();

		await expect(resetAllConsents(kernel)).resolves.toBeUndefined();
	});
});
