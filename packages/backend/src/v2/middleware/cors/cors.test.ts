import { describe, expect, it } from 'vitest';
import { createCORSOptions } from './cors';

describe('createCORSOptions (unit)', () => {
	describe('configuration shape', () => {
		it('returns expected defaults when no trustedOrigins provided', async () => {
			const config = createCORSOptions();
			expect(config.credentials).toBe(true);
			expect(config.maxAge).toBe(600);
			expect(config.allowHeaders).toEqual([
				'Content-Type',
				'Authorization',
				'x-request-id',
			]);
			expect(config.methods).toEqual([
				'GET',
				'POST',
				'PUT',
				'DELETE',
				'PATCH',
				'OPTIONS',
			]);
			// origin present -> echo
			expect(await config.origin('http://localhost:3002')).toBe(
				'http://localhost:3002'
			);
			// no origin -> '*'
			expect(await config.origin('')).toBe('*');
		});
	});

	describe('wildcard "*"', () => {
		it('allows any concrete origin and echoes it back', async () => {
			const config = createCORSOptions(['*']);
			expect(await config.origin('http://localhost:3002')).toBe(
				'http://localhost:3002'
			);
			// missing origin -> '*'
			expect(await config.origin('')).toBe('*');
		});
	});

	describe('specific origins', () => {
		it('allows trusted origin and rejects untrusted', async () => {
			const config = createCORSOptions(['http://localhost:3002']);
			expect(await config.origin('http://localhost:3002')).toBe(
				'http://localhost:3002'
			);
			expect(await config.origin('http://malicious-site.com')).toBeNull();
		});

		it('treats localhost variants (ports, IPs) as trusted when "localhost" provided', async () => {
			const config = createCORSOptions(['localhost']);
			expect(await config.origin('http://localhost:1234')).toBe(
				'http://localhost:1234'
			);
			expect(await config.origin('http://127.0.0.1:3000')).toBe(
				'http://127.0.0.1:3000'
			);
			expect(await config.origin('http://[::1]:3000')).toBe(
				'http://[::1]:3000'
			);
		});
	});

	describe('www and non-www variants', () => {
		it('allows www when non-www is trusted', async () => {
			const config = createCORSOptions(['http://c15t.com']);
			expect(await config.origin('http://www.c15t.com')).toBe(
				'http://www.c15t.com'
			);
		});

		it('allows non-www when www is trusted', async () => {
			const config = createCORSOptions(['http://www.c15t.com']);
			expect(await config.origin('http://c15t.com')).toBe('http://c15t.com');
		});
	});

	describe('ports and protocols', () => {
		it('matches with exact port when provided', async () => {
			const config = createCORSOptions(['localhost:3002']);
			expect(await config.origin('http://localhost:3002')).toBe(
				'http://localhost:3002'
			);
			expect(await config.origin('http://localhost:4000')).toBeNull();
		});

		it('is protocol-agnostic for host comparison', async () => {
			const config = createCORSOptions(['example.com']);
			expect(await config.origin('http://example.com')).toBe(
				'http://example.com'
			);
			expect(await config.origin('https://www.example.com')).toBe(
				'https://www.example.com'
			);
		});
	});

	describe('invalid or missing origins', () => {
		it('returns null for clearly invalid origins', async () => {
			const config = createCORSOptions(['example.com']);
			expect(await config.origin('::::invalid::::')).toBeNull();
		});

		it('returns "*" when origin header is missing/empty', async () => {
			const config = createCORSOptions(['*']);
			expect(await config.origin('')).toBe('*');
		});
	});
});
