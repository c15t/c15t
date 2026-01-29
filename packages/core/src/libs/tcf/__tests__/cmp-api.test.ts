/**
 * Tests for CMP API implementation.
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlobalVendorList } from '../../../types/iab-tcf';
import { createCMPApi } from '../cmp-api';
import { destroyIABStub, initializeIABStub } from '../stub';
import type { CMPApi } from '../types';
import { cleanupTCFApi, createMockGVL, setupStorageMock } from './test-setup';

describe('CMP API', () => {
	let cmpApi: CMPApi;
	let mockGVL: GlobalVendorList;
	let storageMock: ReturnType<typeof setupStorageMock>;

	beforeEach(() => {
		// Clean up any existing __tcfapi
		cleanupTCFApi();

		// Initialize stub first (as would happen in real usage)
		initializeIABStub();

		// Setup mocks
		mockGVL = createMockGVL();
		storageMock = setupStorageMock();

		// Create CMP API
		cmpApi = createCMPApi({
			cmpId: 28,
			cmpVersion: 1,
			gvl: mockGVL,
			gdprApplies: true,
		});
	});

	afterEach(() => {
		cmpApi.destroy();
		destroyIABStub();
		cleanupTCFApi();
		storageMock.cleanup();
	});

	describe('createCMPApi', () => {
		it('should install __tcfapi on window', () => {
			expect(window.__tcfapi).toBeDefined();
			expect(typeof window.__tcfapi).toBe('function');
		});

		it('should return CMP API interface', () => {
			expect(cmpApi).toBeDefined();
			expect(typeof cmpApi.updateConsent).toBe('function');
			expect(typeof cmpApi.setDisplayStatus).toBe('function');
			expect(typeof cmpApi.loadFromStorage).toBe('function');
			expect(typeof cmpApi.saveToStorage).toBe('function');
			expect(typeof cmpApi.getTcString).toBe('function');
			expect(typeof cmpApi.destroy).toBe('function');
		});
	});

	describe('ping command', () => {
		it('should return correct ping data', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('ping', 2, (data, success) => {
					expect(success).toBe(true);
					expect(data).toMatchObject({
						gdprApplies: true,
						cmpLoaded: true,
						cmpStatus: 'loaded',
						cmpId: 28,
						cmpVersion: 1,
						gvlVersion: mockGVL.vendorListVersion,
						tcfPolicyVersion: mockGVL.tcfPolicyVersion,
					});
					resolve();
				});
			});
		});
	});

	describe('getTCData command', () => {
		it('should return TC data', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (data, success) => {
					expect(success).toBe(true);
					expect(data).toBeDefined();
					expect(data).toHaveProperty('tcString');
					expect(data).toHaveProperty('gdprApplies');
					expect(data).toHaveProperty('cmpStatus');
					expect(data).toHaveProperty('purpose');
					expect(data).toHaveProperty('vendor');
					resolve();
				});
			});
		});

		it('should return empty consent data before user action', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getTCData', 2, (data, success) => {
					expect(success).toBe(true);
					expect(data?.tcString).toBe('');
					resolve();
				});
			});
		});
	});

	describe('getVendorList command', () => {
		it('should return the GVL', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('getVendorList', 2, (data, success) => {
					expect(success).toBe(true);
					expect(data).toEqual(mockGVL);
					resolve();
				});
			});
		});
	});

	describe('addEventListener command', () => {
		it('should add listener and call immediately', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (data, success) => {
					expect(success).toBe(true);
					expect(data).toHaveProperty('listenerId');
					expect(data?.eventStatus).toBe('tcloaded');
					resolve();
				});
			});
		});

		it('should assign unique listener IDs', async () => {
			const listenerIds: number[] = [];

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (data) => {
					if (data?.listenerId !== undefined) {
						listenerIds.push(data.listenerId);
					}
					resolve();
				});
			});

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (data) => {
					if (data?.listenerId !== undefined) {
						listenerIds.push(data.listenerId);
					}
					resolve();
				});
			});

			expect(listenerIds).toHaveLength(2);
			expect(listenerIds[0]).not.toBe(listenerIds[1]);
		});
	});

	describe('removeEventListener command', () => {
		it('should remove listener and return success', async () => {
			let listenerId: number | undefined;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (data) => {
					listenerId = data?.listenerId;
					resolve();
				});
			});

			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'removeEventListener',
					2,
					(result) => {
						expect(result).toBe(true);
						resolve();
					},
					listenerId
				);
			});
		});

		it('should return false for non-existent listener', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.(
					'removeEventListener',
					2,
					(result) => {
						expect(result).toBe(false);
						resolve();
					},
					9999
				);
			});
		});
	});

	describe('updateConsent', () => {
		it('should update the TC string', () => {
			const testTcString = 'test-tc-string-123';
			cmpApi.updateConsent(testTcString);

			expect(cmpApi.getTcString()).toBe(testTcString);
		});

		it('should notify event listeners with useractioncomplete', async () => {
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (data) => {
					callCount++;
					// Second call should be from updateConsent
					if (callCount === 2) {
						expect(data?.eventStatus).toBe('useractioncomplete');
						resolve();
					}
				});

				cmpApi.updateConsent('new-tc-string');
			});
		});
	});

	describe('setDisplayStatus', () => {
		it('should notify listeners when status becomes visible', async () => {
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, (data) => {
					callCount++;
					// Second call should be from setDisplayStatus
					if (callCount === 2) {
						expect(data?.eventStatus).toBe('cmpuishown');
						resolve();
					}
				});

				cmpApi.setDisplayStatus('visible');
			});
		});

		it('should not notify listeners for hidden status', async () => {
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, () => {
					callCount++;
					resolve();
				});
			});

			// First call is immediate on addEventListener
			expect(callCount).toBe(1);

			cmpApi.setDisplayStatus('hidden');

			// Wait a bit and check count didn't change
			await new Promise((r) => setTimeout(r, 10));

			// Should not have called again
			expect(callCount).toBe(1);
		});
	});

	describe('Storage', () => {
		it('should save TC string to storage', () => {
			const tcString = 'test-tc-string';
			cmpApi.saveToStorage(tcString);

			// Check localStorage was called
			expect(storageMock.storage.has('c15t_tc_string')).toBe(true);
		});

		it('should load TC string from storage', () => {
			const tcString = 'stored-tc-string';
			storageMock.storage.set('c15t_tc_string', tcString);

			const loaded = cmpApi.loadFromStorage();
			expect(loaded).toBe(tcString);
		});

		it('should return null when no TC string in storage', () => {
			const loaded = cmpApi.loadFromStorage();
			expect(loaded).toBeNull();
		});
	});

	describe('destroy', () => {
		it('should remove __tcfapi from window', () => {
			expect(window.__tcfapi).toBeDefined();

			cmpApi.destroy();

			expect(window.__tcfapi).toBeUndefined();
		});

		it('should clear event listeners', async () => {
			let callCount = 0;

			await new Promise<void>((resolve) => {
				window.__tcfapi?.('addEventListener', 2, () => {
					callCount++;
					resolve();
				});
			});

			expect(callCount).toBe(1); // Initial call

			cmpApi.destroy();

			// CMP is destroyed, listeners should be cleared
		});
	});

	describe('Unknown Command', () => {
		it('should return false for unknown commands', async () => {
			await new Promise<void>((resolve) => {
				window.__tcfapi?.('unknownCommand' as 'ping', 2, (data, success) => {
					expect(success).toBe(false);
					expect(data).toBeNull();
					resolve();
				});
			});
		});
	});
});
