import type { KernelEvent } from '@c15t/core/v3';
import { createConsentKernel } from '@c15t/core/v3';
import { describe, expect, it } from 'vitest';

import {
	KERNEL_EVENT_TYPES,
	kernelEventToDevToolsEvent,
} from '../../core/events';

describe('kernel event mapping', () => {
	it('maps every core kernel event to a serializable log entry', () => {
		const snapshot = createConsentKernel().getSnapshot();
		const events: KernelEvent[] = [
			{ snapshot, type: 'consent:set' },
			{ snapshot, type: 'overrides:set' },
			{ snapshot, type: 'user:identified' },
			{ snapshot, type: 'iab:set' },
			{ snapshot, type: 'init:applied' },
			{ type: 'command:init:started' },
			{ result: { ok: true }, type: 'command:init:completed' },
			{ type: 'command:save:started' },
			{ result: { ok: true }, type: 'command:save:completed' },
			{
				command: 'save',
				error: new Error('transport unavailable'),
				type: 'command:error',
			},
		];

		const mapped = events.map((event, index) =>
			kernelEventToDevToolsEvent(event, String(index + 1), 1234)
		);

		expect(events.map((event) => event.type)).toEqual(KERNEL_EVENT_TYPES);
		expect(mapped.map((event) => event.type)).toEqual(KERNEL_EVENT_TYPES);
		expect(mapped.every((event) => event.message.length > 0)).toBe(true);
		expect(mapped.every((event) => event.timestamp === 1234)).toBe(true);
		expect(mapped.at(-1)?.data).toEqual({
			command: 'save',
			error: 'transport unavailable',
		});
	});
});
