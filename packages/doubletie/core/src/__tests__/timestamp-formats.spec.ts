import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { defineEntity } from '../entity/entity';
import {
	type TimestampFormat,
	createdAtField,
	expiresAtField,
	stringField,
	updatedAtField,
} from '../schema/fields';

describe('Timestamp Formats', () => {
	// Use fixed date for consistent testing
	const FIXED_DATE = new Date('2024-01-01T12:00:00.000Z');
	const FIXED_UNIX = Math.floor(FIXED_DATE.getTime() / 1000);
	const FIXED_UNIX_MS = FIXED_DATE.getTime();

	beforeEach(() => {
		// Mock Date.now for consistent tests
		vi.setSystemTime(FIXED_DATE);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('Entity handles different timestamp formats correctly', async () => {
		// Create an event entity to demonstrate different timestamp formats
		const eventEntity = defineEntity({
			name: 'event',
			fields: {
				id: stringField({ required: true }),
				name: stringField({ required: true }),

				// ISO 8601 string format (default) - make not required for testing
				createdAt: createdAtField({ required: false }),

				// Unix timestamp (seconds since epoch)
				startTime: createdAtField({
					format: 'unix',
					required: false,
				}),

				// Unix timestamp in milliseconds
				endTime: createdAtField({
					format: 'unix_ms',
					required: false,
				}),

				// Date object format
				lastRegistrationDate: createdAtField({
					format: 'date',
					required: false,
				}),

				// UTC timezone - make not required for testing
				utcCreatedAt: createdAtField({ required: false, timezone: 'UTC' }),

				// Custom format (epoch days)
				customDaysSinceEpoch: createdAtField({
					format: 'custom',
					formatFn: (date) =>
						Math.floor(date.getTime() / (1000 * 60 * 60 * 24)),
					parseFn: (value) => new Date((value as number) * 1000 * 60 * 60 * 24),
					required: false,
				}),

				// Expiration with timezone
				expiresAt: expiresAtField({
					format: 'unix',
					timezone: 'UTC',
					required: false,
				}),
			},
		});

		// Create an event with auto-populated timestamps and some explicit ones
		const tomorrow = FIXED_UNIX + 60 * 60 * 24; // One day later in seconds
		const threeDaysLater = FIXED_UNIX_MS + 60 * 60 * 24 * 3 * 1000; // 3 days later in ms
		const thirtyDaysLater = FIXED_UNIX + 60 * 60 * 24 * 30; // 30 days later in seconds

		const event = await eventEntity.validate({
			id: 'event-123',
			name: 'Annual Conference',
			startTime: tomorrow,
			endTime: threeDaysLater,
			expiresAt: thirtyDaysLater,
		});

		// Test auto-populated timestamps
		expect(event.createdAt).toBe(FIXED_DATE.toISOString());
		expect(event.utcCreatedAt).toBe(FIXED_DATE.toISOString());

		// Test explicitly set timestamps
		expect(event.startTime).toBe(tomorrow);
		expect(event.endTime).toBe(threeDaysLater);
		expect(event.expiresAt).toBe(thirtyDaysLater);

		// Test custom format
		expect(event.customDaysSinceEpoch).toBe(
			Math.floor(FIXED_DATE.getTime() / (1000 * 60 * 60 * 24))
		);

		// Use snapshot for full verification
		expect(event).toMatchSnapshot();
	});

	test('UserActivity entity with different timestamp usage', async () => {
		const userActivityEntity = defineEntity({
			name: 'userActivity',
			fields: {
				id: stringField({ required: true }),
				userId: stringField({ required: true }),
				action: stringField({ required: true }),

				// Track when activity was created (ISO format) - make not required for testing
				createdAt: createdAtField({ required: false }),

				// Track when activity was last updated (Unix timestamp) - make not required for testing
				updatedAt: updatedAtField({
					format: 'unix',
					required: false,
				}),
			},
		});

		const userActivity = await userActivityEntity.validate({
			id: 'activity-456',
			userId: 'user-789',
			action: 'login',
		});

		// Test auto-populated timestamps
		expect(userActivity.createdAt).toBe(FIXED_DATE.toISOString());
		expect(userActivity.updatedAt).toBe(FIXED_UNIX);

		// Use snapshot for full verification
		expect(userActivity).toMatchSnapshot();
	});

	test('Format conversions work correctly', async () => {
		// Test all timestamp formats
		const timestampFormats: TimestampFormat[] = [
			'iso',
			'unix',
			'unix_ms',
			'date',
			'custom',
		];

		// Create an entity with a field for each format
		const formatEntity = defineEntity({
			name: 'formats',
			fields: {
				id: stringField({ required: true }),

				// Test each format - make not required for testing
				isoTime: createdAtField({ format: 'iso', required: false }),
				unixTime: createdAtField({ format: 'unix', required: false }),
				unixMsTime: createdAtField({ format: 'unix_ms', required: false }),
				dateTime: createdAtField({ format: 'date', required: false }),
				customTime: createdAtField({
					format: 'custom',
					formatFn: (date) => date.toISOString().substring(0, 10), // Just the date part
					parseFn: (value) => new Date(value as string),
					required: false,
				}),
			},
		});

		const formats = await formatEntity.validate({
			id: 'format-test',
		});

		// Verify each format
		expect(formats.isoTime).toBe(FIXED_DATE.toISOString());
		expect(formats.unixTime).toBe(FIXED_UNIX);
		expect(formats.unixMsTime).toBe(FIXED_UNIX_MS);
		expect(formats.dateTime).toBeInstanceOf(Date);
		expect((formats.dateTime as Date).getTime()).toBe(FIXED_DATE.getTime());
		expect(formats.customTime).toBe(FIXED_DATE.toISOString().substring(0, 10));

		// Use snapshot for full verification
		expect(formats).toMatchSnapshot();
	});
});
