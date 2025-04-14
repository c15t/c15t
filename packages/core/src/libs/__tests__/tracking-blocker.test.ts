import { describe, expect, test } from 'vitest';
import { createTrackingBlocker } from '../tracking-blocker';

describe('TrackingBlocker', () => {
	// Test the creation and destruction of the blocker
	test('creates and destroys tracking blocker', () => {
		// Create the blocker with minimal config
		const blocker = createTrackingBlocker();

		// Verify the blocker was created successfully
		expect(blocker).toBeDefined();
		expect(typeof blocker.destroy).toBe('function');

		// Clean up
		blocker.destroy();
	});

	// Test updating consent values
	test('allows updating consent values', () => {
		// Create the blocker with minimal config
		const blocker = createTrackingBlocker();

		// Update consent values
		blocker.updateConsents({
			measurement: true,
			marketing: false,
		});

		// Verify it didn't error
		expect(blocker).toBeDefined();

		// Clean up
		blocker.destroy();
	});
});
