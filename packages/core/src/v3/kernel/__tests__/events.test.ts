import { describe, expect, test, vi } from 'vitest';
import { createEventBus } from '../events';

describe('createEventBus', () => {
	test('routes events to listeners by type', () => {
		const bus = createEventBus();
		const listener = vi.fn();
		bus.on('consent:set', listener);
		bus.emit({
			type: 'consent:set',
			// biome-ignore lint/suspicious/noExplicitAny: stub snapshot
			snapshot: {} as any,
		});
		expect(listener).toHaveBeenCalledOnce();
	});

	test('does not call listeners for other event types', () => {
		const bus = createEventBus();
		const listener = vi.fn();
		bus.on('consent:set', listener);
		bus.emit({ type: 'command:init:started' });
		expect(listener).not.toHaveBeenCalled();
	});

	test('emit is a no-op when no listeners are registered', () => {
		const bus = createEventBus();
		expect(() => bus.emit({ type: 'command:init:started' })).not.toThrow();
	});

	test('unsubscribe removes the listener', () => {
		const bus = createEventBus();
		const listener = vi.fn();
		const unsubscribe = bus.on('command:init:started', listener);
		unsubscribe();
		bus.emit({ type: 'command:init:started' });
		expect(listener).not.toHaveBeenCalled();
	});

	test('multiple listeners for the same type are called in registration order', () => {
		const bus = createEventBus();
		const calls: string[] = [];
		bus.on('command:init:started', () => calls.push('a'));
		bus.on('command:init:started', () => calls.push('b'));
		bus.on('command:init:started', () => calls.push('c'));
		bus.emit({ type: 'command:init:started' });
		expect(calls).toEqual(['a', 'b', 'c']);
	});
});
