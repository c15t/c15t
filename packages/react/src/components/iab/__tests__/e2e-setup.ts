import { readStoredRecords } from '@c15t/core/modules/persistence';
/**
 * E2E Test Setup for IAB TCF 2.3 Components
 *
 * Provides utilities for browser-based E2E testing of IAB components.
 * Uses MSW (Mock Service Worker) for network-level mocking.
 *
 * @packageDocumentation
 */
import { vi } from 'vitest';

import {
	createDeferredPromise,
	createVoidDeferredPromise,
} from '~/__tests__/deferred-promise';
import { policyFixture } from '~/__tests__/policy-fixture';
import type { ConsentProviderOptions } from '~/provider';
import { offline } from '~/transports/offline';

import { mockGVL } from './fixtures/mock-consent-state';

export type TcfApiTestFunction = (
	command: string,
	version: number,
	callback: (...args: unknown[]) => void,
	parameter?: unknown
) => void;

/**
 * Creates a mock localStorage with full implementation
 */
export const createMockLocalStorage = function createMockLocalStorage() {
	let store: Record<string, string> = {};
	return {
		clear: () => {
			store = {};
		},
		getItem: (key: string) => store[key] || null,
		key: (index: number) => Object.keys(store)[index] || null,
		get length() {
			return Object.keys(store).length;
		},
		removeItem: (key: string) => {
			Reflect.deleteProperty(store, key);
		},
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
	};
};

/**
 * Clears all consent state between tests.
 *
 * Note: GVL mocking is handled via config.iab.gvl, not window mocking.
 */
export const clearConsentState = function clearConsentState() {
	// Clear localStorage
	window.localStorage.clear();

	// Clear all cookies
	const cookies = document.cookie.split(';');
	for (const cookie of cookies) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
		}
	}

	// Reset __tcfapi to fresh state
	if (typeof window !== 'undefined') {
		delete (window as { __tcfapi?: unknown }).__tcfapi;
		delete (window as { __tcfapiQueue?: unknown[] }).__tcfapiQueue;
	}

	// Clear window-level mock GVL state between tests
	delete (window as unknown as { __c15t_mock_gvl?: unknown }).__c15t_mock_gvl;
};

/**
 * Waits for __tcfapi to be ready
 */
export const waitForCMP = function waitForCMP(timeout = 5000): Promise<void> {
	return vi.waitFor(
		() => {
			if (!(window as { __tcfapi?: unknown }).__tcfapi) {
				throw new Error('CMP not ready');
			}
			return createVoidDeferredPromise((resolve, reject) => {
				(window as { __tcfapi: TcfApiTestFunction }).__tcfapi(
					'ping',
					2,
					(ping: { cmpLoaded?: boolean }) => {
						if (ping?.cmpLoaded) {
							resolve();
						} else {
							reject(new Error('CMP not loaded'));
						}
					}
				);
			});
		},
		{ timeout }
	);
};

/**
 * Helper to call __tcfapi as Promise
 */
export const tcfApiPromise = function tcfApiPromise<T>(
	command: string,
	version = 2,
	param?: unknown
): Promise<T> {
	return createDeferredPromise((resolve, reject) => {
		const tcfapi = (window as { __tcfapi?: TcfApiTestFunction }).__tcfapi;
		if (!tcfapi) {
			reject(new Error('__tcfapi not available'));
			return;
		}
		tcfapi(
			command,
			version,
			(result: T, success: boolean) => {
				if (success) {
					resolve(result);
				} else {
					reject(new Error(`__tcfapi ${command} failed`));
				}
			},
			param
		);
	});
};

/**
 * Gets ping data from CMP
 */
export const getCMPPingData = function getCMPPingData(): Promise<{
	gdprApplies: boolean;
	cmpLoaded: boolean;
	cmpStatus: string;
	displayStatus: string;
	apiVersion: string;
	cmpVersion: number;
	cmpId: number;
	gvlVersion: number;
	tcfPolicyVersion: number;
}> {
	return tcfApiPromise('ping', 2);
};

/**
 * Gets TC data from CMP
 */
export const getCMPTCData = function getCMPTCData(): Promise<{
	tcString: string;
	gdprApplies: boolean;
	cmpStatus: string;
	eventStatus: string;
	isServiceSpecific: boolean;
	useNonStandardTexts: boolean;
	publisherCC: string;
	purposeOneTreatment: boolean;
	purpose: {
		consents: Record<number, boolean>;
		legitimateInterests: Record<number, boolean>;
	};
	vendor: {
		consents: Record<number, boolean>;
		legitimateInterests: Record<number, boolean>;
	};
	specialFeatureOptins: Record<number, boolean>;
	publisher: {
		consents: Record<number, boolean>;
		legitimateInterests: Record<number, boolean>;
		customPurpose: {
			consents: Record<number, boolean>;
			legitimateInterests: Record<number, boolean>;
		};
		restrictions: Record<number, Record<number, number>>;
	};
	listenerId?: number;
}> {
	return tcfApiPromise('getTCData', 2);
};

/**
 * Adds event listener and returns a promise for first callback
 */
export const addCMPEventListener = function addCMPEventListener(): Promise<{
	listenerId: number;
	eventStatus: string;
	tcString: string;
}> {
	return createDeferredPromise((resolve, reject) => {
		const tcfapi = (window as { __tcfapi?: TcfApiTestFunction }).__tcfapi;
		if (!tcfapi) {
			reject(new Error('__tcfapi not available'));
			return;
		}
		tcfapi(
			'addEventListener',
			2,
			(data: { listenerId: number; eventStatus: string; tcString: string }) => {
				resolve(data);
			}
		);
	});
};

/**
 * Removes event listener by ID
 */
export const removeCMPEventListener = function removeCMPEventListener(
	listenerId: number
): Promise<boolean> {
	return tcfApiPromise('removeEventListener', 2, listenerId);
};

/**
 * Default provider options for IAB E2E tests.
 *
 * The mock GVL is passed directly in the IAB config to bypass network
 * fetching. This avoids module scope issues in Vitest browser mode.
 */
export const defaultProviderIABOptions: ConsentProviderOptions = {
	iab: {
		cmpId: 160,
		cmpVersion: 1,
		gvl: mockGVL,
	},
	mode: offline(),
	prefetch: policyFixture(undefined, {
		categories: undefined,
		id: 'iab_default',
		model: 'iab',
		prompt: 'choice',
		scopeMode: 'strict',
	}),
};

/**
 * Asserts that TC String contains LI objection for a vendor
 */
export const assertTCStringHasLIObjection =
	async function assertTCStringHasLIObjection(vendorId: number) {
		const tcData = await getCMPTCData();
		const hasLI = tcData.vendor.legitimateInterests[vendorId] === true;
		if (hasLI) {
			throw new Error(
				`Expected vendor ${vendorId} to have LI objection, but LI is granted`
			);
		}
	};

/**
 * Asserts that TC String contains consent for a purpose
 */
export const assertTCStringHasConsent = async function assertTCStringHasConsent(
	purposeId: number
) {
	const tcData = await getCMPTCData();
	const hasConsent = tcData.purpose.consents[purposeId] === true;
	if (!hasConsent) {
		throw new Error(
			`Expected purpose ${purposeId} to have consent, but it does not`
		);
	}
};

/**
 * Waits for an element to appear in the DOM
 */
export const waitForElement = function waitForElement(
	selector: string,
	timeout = 2000
): Promise<Element> {
	return vi.waitFor(
		() => {
			const element = document.querySelector(selector);
			if (!element) {
				throw new Error(`Element ${selector} not found`);
			}
			return element;
		},
		{ timeout }
	);
};

/**
 * Waits for an element to be removed from the DOM
 */
export const waitForElementRemoved = function waitForElementRemoved(
	selector: string,
	timeout = 2000
): Promise<void> {
	return vi.waitFor(
		() => {
			const element = document.querySelector(selector);
			if (element) {
				throw new Error(`Element ${selector} still present`);
			}
		},
		{ timeout }
	);
};

/**
 * Gets consent from localStorage
 */
export const getStoredConsent = function getStoredConsent() {
	const { records } = readStoredRecords(undefined, Date.now());
	return records.choice ? records : null;
};

/**
 * Gets TC string from localStorage
 */
export const getStoredTCString = function getStoredTCString(): string | null {
	return window.localStorage.getItem('euconsent-v2');
};

/**
 * Export the mock GVL for use in tests
 */
export { mockGVL };
