import { describe, expect, it } from 'vitest';
import type { C15TOptions } from '~/types';
import { getIpAddress, maskIpAddress } from './index';

describe('maskIpAddress', () => {
	describe('IPv4 addresses', () => {
		it('should mask the last octet of a standard IPv4 address', () => {
			expect(maskIpAddress('192.168.1.100')).toBe('192.168.1.0');
		});

		it('should mask the last octet of localhost', () => {
			expect(maskIpAddress('127.0.0.1')).toBe('127.0.0.0');
		});

		it('should mask the last octet of a public IP', () => {
			expect(maskIpAddress('8.8.8.8')).toBe('8.8.8.0');
		});

		it('should handle IP with last octet already zero', () => {
			expect(maskIpAddress('10.0.0.0')).toBe('10.0.0.0');
		});

		it('should handle IP with max values', () => {
			expect(maskIpAddress('255.255.255.255')).toBe('255.255.255.0');
		});
	});

	describe('IPv6 addresses', () => {
		it('should mask the last 80 bits of a full IPv6 address', () => {
			const result = maskIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
			expect(result).toBe('2001:db8:85a3::');
		});

		it('should mask a compressed IPv6 address', () => {
			const result = maskIpAddress('2001:db8:85a3::1');
			expect(result).toBe('2001:db8:85a3::');
		});

		it('should handle localhost IPv6', () => {
			const result = maskIpAddress('::1');
			expect(result).toBe('::');
		});

		it('should handle full zeros IPv6', () => {
			const result = maskIpAddress('::');
			expect(result).toBe('::');
		});

		it('should mask IPv6 with leading zeros compressed', () => {
			const result = maskIpAddress('::ffff:0:0:1');
			expect(result).toBe('::');
		});
	});

	describe('IPv4-mapped IPv6 addresses', () => {
		it('should mask the IPv4 portion of IPv4-mapped IPv6', () => {
			const result = maskIpAddress('::ffff:192.168.1.100');
			expect(result).toBe('::ffff:192.168.1.0');
		});

		it('should handle IPv4-mapped IPv6 localhost', () => {
			const result = maskIpAddress('::ffff:127.0.0.1');
			expect(result).toBe('::ffff:127.0.0.0');
		});
	});

	describe('edge cases', () => {
		it('should return "unknown" unchanged', () => {
			expect(maskIpAddress('unknown')).toBe('unknown');
		});

		it('should return empty string unchanged', () => {
			expect(maskIpAddress('')).toBe('');
		});

		it('should handle malformed IPv4 gracefully', () => {
			expect(maskIpAddress('192.168.1')).toBe('192.168.1');
		});
	});
});

describe('getIpAddress', () => {
	const createMockHeaders = (headers: Record<string, string>): Headers => {
		return new Headers(headers);
	};

	const createBaseOptions = (
		ipAddressOverrides?: NonNullable<C15TOptions['advanced']>['ipAddress']
	): C15TOptions => ({
		trustedOrigins: ['http://localhost'],
		adapter: {} as C15TOptions['adapter'],
		advanced: {
			ipAddress: ipAddressOverrides,
		},
	});

	describe('IP extraction', () => {
		it('should extract IP from x-forwarded-for header', () => {
			const headers = createMockHeaders({
				'x-forwarded-for': '192.168.1.100, 10.0.0.1',
			});
			const options = createBaseOptions();

			expect(getIpAddress(headers, options)).toBe('192.168.1.100');
		});

		it('should extract IP from cf-connecting-ip header', () => {
			const headers = createMockHeaders({
				'cf-connecting-ip': '8.8.8.8',
			});
			const options = createBaseOptions();

			expect(getIpAddress(headers, options)).toBe('8.8.8.8');
		});

		it('should return "unknown" when no IP headers present', () => {
			const headers = createMockHeaders({});
			const options = createBaseOptions();

			expect(getIpAddress(headers, options)).toBe('unknown');
		});
	});

	describe('IP tracking disabled', () => {
		it('should return "unknown" when IP tracking is disabled', () => {
			const headers = createMockHeaders({
				'x-forwarded-for': '192.168.1.100',
			});
			const options = createBaseOptions({
				tracking: false,
			});

			expect(getIpAddress(headers, options)).toBe('unknown');
		});
	});

	describe('IP masking enabled', () => {
		it('should mask IPv4 address when masking is enabled', () => {
			const headers = createMockHeaders({
				'x-forwarded-for': '192.168.1.100',
			});
			const options = createBaseOptions({
				masking: true,
			});

			expect(getIpAddress(headers, options)).toBe('192.168.1.0');
		});

		it('should mask IPv6 address when masking is enabled', () => {
			const headers = createMockHeaders({
				'x-forwarded-for': '2001:db8:85a3::8a2e:370:7334',
			});
			const options = createBaseOptions({
				masking: true,
			});

			expect(getIpAddress(headers, options)).toBe('2001:db8:85a3::');
		});

		it('should not mask when masking is disabled (default)', () => {
			const headers = createMockHeaders({
				'x-forwarded-for': '192.168.1.100',
			});
			const options = createBaseOptions();

			expect(getIpAddress(headers, options)).toBe('192.168.1.100');
		});

		it('should not mask when masking is explicitly false', () => {
			const headers = createMockHeaders({
				'x-forwarded-for': '192.168.1.100',
			});
			const options = createBaseOptions({
				masking: false,
			});

			expect(getIpAddress(headers, options)).toBe('192.168.1.100');
		});
	});

	describe('custom headers', () => {
		it('should use custom IP headers when provided', () => {
			const headers = createMockHeaders({
				'x-custom-ip': '10.0.0.1',
				'x-forwarded-for': '192.168.1.100',
			});
			const options = createBaseOptions({
				ipAddressHeaders: ['x-custom-ip'],
			});

			expect(getIpAddress(headers, options)).toBe('10.0.0.1');
		});
	});
});
