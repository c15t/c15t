import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseConfiguration } from '~/pkgs/db-adapters/adapters/kysely-adapter/types';
import { memoryAdapter } from '~/pkgs/db-adapters/adapters/memory-adapter';
import { init } from './init';
import type { C15TPlugin } from './types';

describe('init', () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	it('should initialize with basic config', async () => {
		const result = await init({
			baseURL: 'http://localhost:3000',
			database: memoryAdapter({}),
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const ctx = result.value;
			expect(ctx.options.baseURL).toBe('http://localhost:3000');
			expect(ctx.options.basePath).toBe('/api/c15t');
			expect(ctx.appName).toBe('c15t Consent Manager');
		}
	});

	it('should infer base URL from environment', async () => {
		vi.stubEnv('C15T_URL', 'http://localhost:5147');

		const result = await init({
			database: memoryAdapter({}),
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const ctx = result.value;
			expect(ctx.options.baseURL).toBe('http://localhost:5147');
		}

		vi.unstubAllEnvs();
	});

	it('should respect custom base path', async () => {
		const result = await init({
			baseURL: 'http://localhost:3000',
			basePath: '/custom-path',
			database: memoryAdapter({}),
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const ctx = result.value;
			expect(ctx.options.basePath).toBe('/custom-path');
		}
	});

	it('should initialize plugins', async () => {
		const newBaseURL = 'http://test.test';
		const result = await init({
			baseURL: 'http://localhost:3000',
			database: memoryAdapter({}),
			plugins: [
				{
					id: 'test-plugin',
					name: 'Test Plugin',
					type: 'test',
					init: () => ({
						context: {
							baseURL: newBaseURL,
						},
					}),
				} as C15TPlugin,
			],
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const ctx = result.value;
			expect(ctx.baseURL).toBe(newBaseURL);
		}
	});

	it('should allow plugins to modify options', async () => {
		const result = await init({
			baseURL: 'http://localhost:3000',
			database: memoryAdapter({}),
			plugins: [
				{
					id: 'test-plugin',
					name: 'Test Plugin',
					type: 'test',
					init: () => ({
						options: {
							baseURL: 'http://test.test',
						},
					}),
				} as C15TPlugin,
			],
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const ctx = result.value;
			expect(ctx.options.baseURL).toBe('http://test.test');
		}
	});

	it('should handle plugin initialization errors', async () => {
		const result = await init({
			baseURL: 'http://localhost:3000',
			database: memoryAdapter({}),
			plugins: [
				{
					id: 'error-plugin',
					name: 'Error Plugin',
					type: 'test',
					init: () => {
						throw new Error('Plugin initialization failed');
					},
				} as C15TPlugin,
			],
		});

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.message).toContain('Plugin initialization failed');
		}
	});

	it('should handle storage adapter errors', async () => {
		const result = await init({
			baseURL: 'http://localhost:3000',
			database: null as unknown as DatabaseConfiguration,
		});

		expect(result.isErr()).toBe(false);
		if (result.isErr()) {
			expect(result.error.message).toContain(
				'Failed to initialize consent system'
			);
		}
	});

	it('should handle secret from environment', async () => {
		vi.stubEnv('C15T_SECRET', 'test-secret');

		const result = await init({
			baseURL: 'http://localhost:3000',
			database: memoryAdapter({}),
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const ctx = result.value;
			expect(ctx.secret).toBe('test-secret');
		}

		vi.unstubAllEnvs();
	});

	it('should handle multiple plugins in sequence', async () => {
		const result = await init({
			baseURL: 'http://localhost:3000',
			database: memoryAdapter({}),
			plugins: [
				{
					id: 'plugin-1',
					name: 'Plugin 1',
					type: 'test',
					init: () => ({
						options: {
							baseURL: 'http://plugin1.test',
						},
					}),
				} as C15TPlugin,
				{
					id: 'plugin-2',
					name: 'Plugin 2',
					type: 'test',
					init: () => ({
						options: {
							baseURL: 'http://plugin2.test',
						},
					}),
				} as C15TPlugin,
			],
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const ctx = result.value;
			expect(ctx.options.baseURL).toBe('http://plugin2.test');
		}
	});

	it('should configure trusted origins', async () => {
		const result = await init({
			baseURL: 'http://localhost:3000',
			database: memoryAdapter({}),
			trustedOrigins: ['http://trusted.test'],
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const ctx = result.value;
			expect(ctx.trustedOrigins).toContain('http://localhost:3000');
			expect(ctx.trustedOrigins).toContain('http://trusted.test');
		}
	});

	it('should handle plugin context modifications', async () => {
		const result = await init({
			baseURL: 'http://localhost:3000',
			database: memoryAdapter({}),
			plugins: [
				{
					id: 'context-plugin',
					name: 'Context Plugin',
					type: 'test',
					init: () => ({
						context: {
							appName: 'Modified App Name',
						},
					}),
				} as C15TPlugin,
			],
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			const ctx = result.value;
			expect(ctx.appName).toBe('Modified App Name');
		}
	});
});
