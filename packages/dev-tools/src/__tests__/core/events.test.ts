import type { KernelEvent } from '@c15t/core';
import { createConsentKernel } from '@c15t/core';
import { describe, expect, it, vi } from 'vitest';

import {
	KERNEL_EVENT_TYPES,
	kernelEventToDevToolsEvent,
} from '../../core/events';
import { createDevTools } from '../../index';

describe('kernel event mapping', () => {
	it('does not disrupt failed saves when an Error message getter throws', async () => {
		const error = new Error('transport failure');
		Object.defineProperty(error, 'message', {
			enumerable: true,
			get() {
				throw new Error('unreadable message');
			},
		});
		const kernel = createConsentKernel({
			transport: { save: vi.fn().mockRejectedValue(error) },
		});
		const devTools = createDevTools({ kernel });
		try {
			await expect(kernel.commands.save('all')).resolves.toMatchObject({
				ok: false,
			});
			const event = devTools
				.getState()
				.events.find((entry) => entry.type === 'command:error');
			expect(event).toBeDefined();
			expect(() => JSON.stringify(event)).not.toThrow();
			expect(event?.data?.error).toContain('Unserializable');
		} finally {
			devTools.destroy();
		}
	});
	it('captures circular and bigint transport results without breaking the log', () => {
		const data: Record<string, unknown> = { count: 1n };
		data.self = data;
		const event = kernelEventToDevToolsEvent(
			{ result: { error: data, ok: false }, type: 'command:init:completed' },
			'1',
			0
		);
		expect(() => JSON.stringify(event)).not.toThrow();
		expect(JSON.stringify(event)).toContain('[Circular]');
		expect(JSON.stringify(event)).toContain('count');
	});
	it('maps every core kernel event to a serializable log entry', () => {
		const snapshot = createConsentKernel().getSnapshot();
		const events: KernelEvent[] = [
			{ type: 'records:cleared' },
			{
				actionAt: 1,
				confirmed: ['marketing'],
				snapshot,
				type: 'choice:recorded',
			},
			{
				previous: snapshot.effectivePermissions,
				snapshot,
				type: 'permissions:changed',
			},
			{
				dismissal: { dismissedAt: 1, fingerprint: 'notice', version: 1 },
				snapshot,
				type: 'notice:dismissed',
			},
			{
				directive: { categories: ['marketing'], recordedAt: 1, source: 'gpc' },
				snapshot,
				type: 'privacy:opt-out',
			},
			{ snapshot, type: 'overrides:set' },
			{ snapshot, type: 'user:identified' },
			{ snapshot, type: 'subject:resolved' },
			{ snapshot, type: 'iab:set' },
			{ snapshot, type: 'init:applied' },
			{
				attempt: 1,
				error: new Error('offline'),
				nextRetryMs: null,
				type: 'init:failed',
			},
			{ ok: true, subjectId: 'test', type: 'save:replayed' },
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
