import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as env from '~/pkgs/utils/env';
import { getIp } from '../ip';

// Mock the isTest variable
vi.mock('~/pkgs/utils/env', async () => {
	const actual = await vi.importActual('~/pkgs/utils/env');
	return {
		...(actual as object),
		isTest: false,
	};
});

describe('getIp', () => {
	let mockHeaders: Headers;

	beforeEach(() => {
		mockHeaders = new Headers();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('should return null when disableIpTracking is true', () => {
		const options = {
			advanced: {
				ipAddress: {
					disableIpTracking: true,
				},
			},
		};

		const ip = getIp(mockHeaders, options);
		expect(ip).toBeNull();
	});

	test('should return test IP in test environment', () => {
		// Set isTest to true for this test
		vi.spyOn(env, 'isTest', 'get').mockReturnValue(true);

		const options = {};
		const ip = getIp(mockHeaders, options);

		expect(ip).toBe('127.0.0.1');
	});

	test('should extract IP from x-forwarded-for header', () => {
		mockHeaders.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');

		const options = {};
		const ip = getIp(mockHeaders, options);

		expect(ip).toBe('192.168.1.1');
	});

	test('should extract IP from cf-connecting-ip header', () => {
		mockHeaders.set('cf-connecting-ip', '192.168.1.2');

		const options = {};
		const ip = getIp(mockHeaders, options);

		expect(ip).toBe('192.168.1.2');
	});

	test('should prioritize headers in the correct order', () => {
		mockHeaders.set('x-forwarded-for', '192.168.1.10, 10.0.0.1');
		mockHeaders.set('x-real-ip', '192.168.1.20');

		const options = {};
		const ip = getIp(mockHeaders, options);

		// Should pick the first in the list (x-forwarded-for before x-real-ip)
		expect(ip).toBe('192.168.1.10');
	});

	test('should use custom IP headers when provided', () => {
		mockHeaders.set('custom-ip-header', '192.168.1.30');

		const options = {
			advanced: {
				ipAddress: {
					ipAddressHeaders: ['custom-ip-header'],
				},
			},
		};

		const ip = getIp(mockHeaders, options);

		expect(ip).toBe('192.168.1.30');
	});

	test('should handle Request objects correctly', () => {
		const mockRequest = new Request('https://example.com');
		mockRequest.headers.set('x-forwarded-for', '192.168.1.40');

		const options = {};
		const ip = getIp(mockRequest, options);

		expect(ip).toBe('192.168.1.40');
	});

	test('should return null when no IP headers are found', () => {
		const options = {};
		const ip = getIp(mockHeaders, options);

		expect(ip).toBeNull();
	});
});
