import { describe, expect, test, vi } from 'vitest';
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

	// Another library's fetch wrapper can expose a property through a getter.
	test('wraps a fetch with a getter-only property', () => {
		const wrapped = Object.assign(async () => new Response(), {
			preconnect: () => undefined,
		});
		Object.defineProperty(wrapped, 'instrumented', {
			enumerable: true,
			get: () => true,
		});
		vi.stubGlobal('fetch', wrapped);
		window.fetch = wrapped as typeof window.fetch;

		const blocker = createTrackingBlocker();

		expect(window.fetch).not.toBe(wrapped);
		expect(
			(window.fetch as unknown as { instrumented: boolean }).instrumented
		).toBe(true);
		expect(
			(window.fetch as unknown as { preconnect: unknown }).preconnect
		).toBe(wrapped.preconnect);

		blocker.destroy();
		vi.unstubAllGlobals();
	});
});
