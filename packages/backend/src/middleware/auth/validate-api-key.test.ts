import { describe, expect, it } from 'vitest';
import {
	extractBearerToken,
	validateApiKey,
	validateRequestAuth,
} from './validate-api-key';

describe('extractBearerToken', () => {
	it('should extract token from valid Bearer header', () => {
		expect(extractBearerToken('Bearer sk_live_abc123')).toBe('sk_live_abc123');
	});

	it('should return null for non-Bearer auth', () => {
		expect(extractBearerToken('Basic abc123')).toBeNull();
	});

	it('should return null for missing Bearer prefix', () => {
		expect(extractBearerToken('sk_live_abc123')).toBeNull();
	});

	it('should return null for null header', () => {
		expect(extractBearerToken(null)).toBeNull();
	});

	it('should return null for empty header', () => {
		expect(extractBearerToken('')).toBeNull();
	});

	it('should handle extra spaces', () => {
		expect(extractBearerToken('Bearer  abc123')).toBeNull(); // Two spaces
	});
});

describe('validateApiKey', () => {
	const validKeys = ['sk_live_abc123', 'sk_live_def456'];

	it('should return true for valid key', () => {
		expect(validateApiKey('sk_live_abc123', validKeys)).toBe(true);
		expect(validateApiKey('sk_live_def456', validKeys)).toBe(true);
	});

	it('should return false for invalid key', () => {
		expect(validateApiKey('sk_live_invalid', validKeys)).toBe(false);
	});

	it('should return false for null token', () => {
		expect(validateApiKey(null, validKeys)).toBe(false);
	});

	it('should return false for undefined keys', () => {
		expect(validateApiKey('sk_live_abc123', undefined)).toBe(false);
	});

	it('should return false for empty keys array', () => {
		expect(validateApiKey('sk_live_abc123', [])).toBe(false);
	});

	it('should be case-sensitive', () => {
		expect(validateApiKey('SK_LIVE_ABC123', validKeys)).toBe(false);
	});
});

describe('validateRequestAuth', () => {
	const validKeys = ['sk_live_abc123'];

	it('should return true for valid Authorization header', () => {
		const headers = new Headers();
		headers.set('Authorization', 'Bearer sk_live_abc123');
		expect(validateRequestAuth(headers, validKeys)).toBe(true);
	});

	it('should return false for invalid token', () => {
		const headers = new Headers();
		headers.set('Authorization', 'Bearer sk_live_invalid');
		expect(validateRequestAuth(headers, validKeys)).toBe(false);
	});

	it('should return false for missing Authorization header', () => {
		const headers = new Headers();
		expect(validateRequestAuth(headers, validKeys)).toBe(false);
	});

	it('should return false for undefined headers', () => {
		expect(validateRequestAuth(undefined, validKeys)).toBe(false);
	});
});
