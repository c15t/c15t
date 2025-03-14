import { beforeEach, describe, expect, it } from 'vitest';
import type { C15TContext } from '~/pkgs/types';
import { createMockContext } from '~/pkgs/utils/test-mocks';
import { status } from '../status';

describe('Status Endpoint', () => {
	let mockContext: C15TContext;

	beforeEach(() => {
		mockContext = createMockContext();
	});

	it('should return status response', async () => {
		const response = await status({
			context: mockContext,
			params: undefined,
			query: undefined,
			body: undefined,
		});

		expect(response.status).toBe('ok');
	});

	it('should include version in context', async () => {
		const response = await status({
			context: mockContext,
			params: undefined,
			query: undefined,
			body: undefined,
		});

		expect(response.status).toBe('ok');
		expect(response.version).toBeDefined();
		expect(typeof response.version).toBe('string');
	});
});
