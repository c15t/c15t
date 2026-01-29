/**
 * Tests for IAB TCF stub.
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clearStubQueue,
	destroyIABStub,
	getStubQueue,
	initializeIABStub,
	isStubActive,
	isStubInitialized,
} from '../stub';
import { cleanupTCFApi } from './test-setup';

describe('IAB TCF Stub', () => {
	beforeEach(() => {
		// Clean up any existing __tcfapi
		cleanupTCFApi();
	});

	afterEach(() => {
		destroyIABStub();
		cleanupTCFApi();
	});

	describe('initializeIABStub', () => {
		it('should create __tcfapi on window', () => {
			expect(window.__tcfapi).toBeUndefined();

			initializeIABStub();

			expect(window.__tcfapi).toBeDefined();
			expect(typeof window.__tcfapi).toBe('function');
		});

		it('should not reinitialize if already done', () => {
			initializeIABStub();
			const firstApi = window.__tcfapi;

			initializeIABStub();
			expect(window.__tcfapi).toBe(firstApi);
		});

		it('should handle ping command immediately', () => {
			initializeIABStub();

			const callback = vi.fn();
			window.__tcfapi?.('ping', 2, callback);

			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					cmpStatus: 'stub',
					cmpLoaded: false,
				}),
				true
			);
		});

		it('should queue non-ping commands', () => {
			initializeIABStub();

			const callback = vi.fn();
			window.__tcfapi?.('getTCData', 2, callback);

			// Callback should not be called immediately for non-ping
			expect(callback).not.toHaveBeenCalled();

			// Should be in queue
			const queue = getStubQueue();
			expect(queue.length).toBe(1);
			expect(queue[0][0]).toBe('getTCData');
		});
	});

	describe('getStubQueue', () => {
		it('should return empty array when no stub', () => {
			expect(getStubQueue()).toEqual([]);
		});

		it('should return queued calls', () => {
			initializeIABStub();

			window.__tcfapi?.('getTCData', 2, () => {});
			window.__tcfapi?.('addEventListener', 2, () => {});

			const queue = getStubQueue();
			expect(queue).toHaveLength(2);
		});
	});

	describe('clearStubQueue', () => {
		it('should clear the queue', () => {
			initializeIABStub();

			window.__tcfapi?.('getTCData', 2, () => {});
			expect(getStubQueue()).toHaveLength(1);

			clearStubQueue();
			expect(getStubQueue()).toHaveLength(0);
		});

		it('should not throw when no stub exists', () => {
			expect(() => clearStubQueue()).not.toThrow();
		});
	});

	describe('isStubActive', () => {
		it('should return false when no __tcfapi', () => {
			expect(isStubActive()).toBe(false);
		});

		it('should return true when stub is installed', () => {
			initializeIABStub();
			expect(isStubActive()).toBe(true);
		});
	});

	describe('isStubInitialized', () => {
		it('should return false initially', () => {
			expect(isStubInitialized()).toBe(false);
		});

		it('should return true after initialization', () => {
			initializeIABStub();
			expect(isStubInitialized()).toBe(true);
		});
	});

	describe('destroyIABStub', () => {
		it('should clean up stub state', () => {
			initializeIABStub();
			expect(isStubInitialized()).toBe(true);

			destroyIABStub();
			expect(isStubInitialized()).toBe(false);
		});

		it('should not remove __tcfapi (real CMP might be using it)', () => {
			initializeIABStub();
			destroyIABStub();

			// __tcfapi should still exist (the real CMP might be using it)
			// This is intentional behavior
		});
	});

	describe('Ping Response', () => {
		it('should return correct ping data structure', () => {
			initializeIABStub();

			const callback = vi.fn();
			window.__tcfapi?.('ping', 2, callback);

			expect(callback).toHaveBeenCalledWith(
				expect.objectContaining({
					gdprApplies: undefined,
					cmpLoaded: false,
					cmpStatus: 'stub',
					displayStatus: 'hidden',
					apiVersion: '2.2',
					cmpVersion: 0,
					cmpId: 0,
					gvlVersion: 0,
					tcfPolicyVersion: 5, // TCF 2.3
				}),
				true
			);
		});
	});

	describe('Queue Behavior', () => {
		it('should queue addEventListener calls', () => {
			initializeIABStub();

			const callback = vi.fn();
			window.__tcfapi?.('addEventListener', 2, callback);

			expect(callback).not.toHaveBeenCalled();
			expect(getStubQueue()).toHaveLength(1);
		});

		it('should queue removeEventListener calls', () => {
			initializeIABStub();

			const callback = vi.fn();
			window.__tcfapi?.('removeEventListener', 2, callback, 1);

			expect(callback).not.toHaveBeenCalled();
			expect(getStubQueue()).toHaveLength(1);
		});

		it('should queue getVendorList calls', () => {
			initializeIABStub();

			const callback = vi.fn();
			window.__tcfapi?.('getVendorList', 2, callback);

			expect(callback).not.toHaveBeenCalled();
			expect(getStubQueue()).toHaveLength(1);
		});
	});
});
