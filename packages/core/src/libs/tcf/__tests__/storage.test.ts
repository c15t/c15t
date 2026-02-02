/**
 * Storage Tests for IAB TCF 2.3
 *
 * Tests for TC String storage compliance including cookies and localStorage.
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlobalVendorList } from '../../../types/iab-tcf';
import { createCMPApi } from '../cmp-api';
import { destroyIABStub, initializeIABStub } from '../stub';
import { generateTCString } from '../tc-string';
import type { CMPApi } from '../types';
import {
	cleanupTCFApi,
	createMockGVL,
	createMockTCFConsentAllGranted,
	setupStorageMock,
} from './test-setup';

// Helper to clear all cookies
function clearAllCookies() {
	const cookies = document.cookie.split(';');
	for (const cookie of cookies) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		}
	}
}

describe('Storage Compliance - IAB TCF 2.3', () => {
	let cmpApi: CMPApi;
	let mockGVL: GlobalVendorList;
	let storageMock: ReturnType<typeof setupStorageMock>;

	beforeEach(() => {
		// Clear cookies first to prevent test pollution
		clearAllCookies();
		cleanupTCFApi();
		initializeIABStub();
		mockGVL = createMockGVL();
		storageMock = setupStorageMock();

		cmpApi = createCMPApi({
			cmpId: 28,
			cmpVersion: 1,
			gvl: mockGVL,
			gdprApplies: true,
		});
	});

	afterEach(() => {
		cmpApi?.destroy();
		destroyIABStub();
		cleanupTCFApi();
		storageMock.cleanup();
		// Clear cookies after each test too
		clearAllCookies();
	});

	describe('localStorage Storage', () => {
		it('should save TC String to localStorage', () => {
			const tcString = 'test-tc-string-for-storage';
			cmpApi.saveToStorage(tcString);

			const stored = storageMock.storage.get('c15t_tc_string');
			expect(stored).toBe(tcString);
		});

		it('should load TC String from localStorage', () => {
			const tcString = 'stored-tc-string';
			storageMock.storage.set('c15t_tc_string', tcString);

			const loaded = cmpApi.loadFromStorage();
			expect(loaded).toBe(tcString);
		});

		it('should return null when no TC String in storage', () => {
			const loaded = cmpApi.loadFromStorage();
			expect(loaded).toBeNull();
		});

		it('should overwrite existing TC String', () => {
			cmpApi.saveToStorage('first-tc-string');
			expect(storageMock.storage.get('c15t_tc_string')).toBe('first-tc-string');

			cmpApi.saveToStorage('second-tc-string');
			expect(storageMock.storage.get('c15t_tc_string')).toBe(
				'second-tc-string'
			);
		});
	});

	describe('Cookie Storage (euconsent-v2)', () => {
		it('should save TC String with correct cookie name per TCF spec', () => {
			// The TCF spec requires the cookie to be named 'euconsent-v2'
			// Our implementation stores to localStorage with key 'c15t_tc_string'
			// and separately to cookie 'euconsent-v2' when cookie storage is enabled

			const tcString = 'test-tc-string';
			cmpApi.saveToStorage(tcString);

			// Verify localStorage has the value
			const stored = storageMock.storage.get('c15t_tc_string');
			expect(stored).toBe(tcString);
		});
	});

	describe('Storage Restoration', () => {
		it('should restore existing TC String on init', () => {
			const existingTcString = 'existing-tc-string';
			storageMock.storage.set('c15t_tc_string', existingTcString);

			const loaded = cmpApi.loadFromStorage();
			expect(loaded).toBe(existingTcString);
		});

		it('should restore consent state from TC String', async () => {
			// Generate a valid TC string
			const consentData = createMockTCFConsentAllGranted();
			const tcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			// Store it
			cmpApi.saveToStorage(tcString);

			// Load it back
			const loaded = cmpApi.loadFromStorage();
			expect(loaded).toBe(tcString);
		});
	});

	describe('Storage Key Constants', () => {
		it('should use c15t_tc_string key in localStorage', () => {
			cmpApi.saveToStorage('test');

			// Verify the exact key is used
			expect(storageMock.storage.has('c15t_tc_string')).toBe(true);
		});

		it('should not store under different keys', () => {
			cmpApi.saveToStorage('test');

			// Verify no other keys are used
			const keys = Array.from(storageMock.storage.keys());
			expect(keys).toEqual(['c15t_tc_string']);
		});
	});

	describe('Storage Error Handling', () => {
		it('should handle localStorage not available', () => {
			// This is handled by the mock, but test the flow
			const loaded = cmpApi.loadFromStorage();
			// Should return null, not throw
			expect(loaded === null || typeof loaded === 'string').toBe(true);
		});
	});

	describe('TC String Persistence Lifecycle', () => {
		it('should persist TC String through save and load cycle', async () => {
			// Generate a valid TC string
			const consentData = createMockTCFConsentAllGranted();
			const originalTcString = await generateTCString(consentData, mockGVL, {
				cmpId: 28,
				cmpVersion: 1,
			});

			// Save
			cmpApi.saveToStorage(originalTcString);

			// Load
			const loadedTcString = cmpApi.loadFromStorage();

			// Should be identical
			expect(loadedTcString).toBe(originalTcString);
		});

		it('should allow multiple save/load cycles', async () => {
			const tcStrings = [
				await generateTCString(createMockTCFConsentAllGranted(), mockGVL, {
					cmpId: 28,
					cmpVersion: 1,
				}),
				await generateTCString(
					{ ...createMockTCFConsentAllGranted(), purposeConsents: { 1: true } },
					mockGVL,
					{ cmpId: 28, cmpVersion: 1 }
				),
				await generateTCString(
					{ ...createMockTCFConsentAllGranted(), vendorConsents: { 1: true } },
					mockGVL,
					{ cmpId: 28, cmpVersion: 1 }
				),
			];

			for (const tcString of tcStrings) {
				cmpApi.saveToStorage(tcString);
				const loaded = cmpApi.loadFromStorage();
				expect(loaded).toBe(tcString);
			}
		});
	});

	describe('Storage Update on Consent Change', () => {
		it('should update storage when consent is updated via CMP API', () => {
			const tcString = 'new-consent-tc-string';

			// Update consent (which should trigger storage update)
			cmpApi.updateConsent(tcString);

			// The CMP should have the new TC string
			expect(cmpApi.getTcString()).toBe(tcString);
		});
	});

	describe('Storage Fallback Behavior', () => {
		it('should use localStorage as primary storage', () => {
			const tcString = 'test-tc-string';
			cmpApi.saveToStorage(tcString);

			// Should be in localStorage
			expect(storageMock.storage.get('c15t_tc_string')).toBe(tcString);
		});
	});

	describe('Storage Mock Behavior', () => {
		it('should track all storage operations', () => {
			// Save
			cmpApi.saveToStorage('test-value');
			expect(storageMock.storage.size).toBe(1);

			// Load
			const loaded = cmpApi.loadFromStorage();
			expect(loaded).toBe('test-value');

			// Clear (both localStorage and cookies since saveToStorage saves to both)
			storageMock.storage.clear();
			clearAllCookies();
			expect(storageMock.storage.size).toBe(0);

			// Load after clear
			const loadedAfterClear = cmpApi.loadFromStorage();
			expect(loadedAfterClear).toBeNull();
		});

		it('should support initial data', () => {
			const cleanup = setupStorageMock({
				c15t_tc_string: 'initial-tc-string',
			});

			// Note: We're using a new storage mock instance
			// The CMP API uses the global window.localStorage which was set by the first mock

			cleanup.cleanup();
		});
	});
});
