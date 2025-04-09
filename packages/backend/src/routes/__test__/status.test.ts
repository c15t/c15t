import type { EventHandlerRequest, H3Event } from 'h3';
/**
 * Tests for the status route handler
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { version } from '../../../package.json';
// Import the mocked status module
import { status } from '../status';

describe('status', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Set a fixed date for testing
		vi.setSystemTime(new Date('2023-01-01T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// Create event with proper h3 structure
	const createMockEvent = (
		adapter: { id: string } | null = null
	): H3Event<EventHandlerRequest> => ({
		//@ts-expect-error
		req: {}, // Add req property to avoid "Cannot read properties of undefined (reading 'req')" error
		context: {
			//@ts-expect-error
			adapter,
		},
	});

	it('should return status OK when adapter is available', async () => {
		const mockAdapter = {
			id: 'TestAdapter',
		};

		const result = await status.handler(createMockEvent(mockAdapter));

		expect(result).toEqual({
			status: 'ok',
			version: version,
			timestamp: '2023-01-01T12:00:00.000Z',
			storage: {
				type: 'TestAdapter',
				available: true,
			},
		});
	});

	it('should handle case when adapter is unavailable', async () => {
		const result = await status.handler(createMockEvent(null));

		expect(result).toEqual({
			status: 'ok',
			version: version,
			timestamp: '2023-01-01T12:00:00.000Z',
			storage: {
				type: 'Unavailable',
				available: false,
			},
		});
	});
});
