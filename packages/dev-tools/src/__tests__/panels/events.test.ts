import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventLogEntry } from '../../core/state-manager';
import { renderEventsPanel } from '../../panels/events';

describe('events panel', () => {
	let container: HTMLDivElement;
	let events: EventLogEntry[];

	beforeEach(() => {
		container = document.createElement('div');
		events = [
			{
				data: { method: 'GET', url: 'https://example.com' },
				id: 'network-1',
				message: 'Network blocked: GET https://example.com',
				timestamp: Date.now(),
				type: 'network',
			},
			{
				data: { tcString: 'abc' },
				id: 'iab-1',
				message: 'IAB preferences saved',
				timestamp: Date.now() - 1000,
				type: 'iab',
			},
		];
	});

	it('filters events by type and shows payload data', () => {
		renderEventsPanel(container, {
			getEvents: () => events,
			onClear: vi.fn(),
		});

		const networkFilter = [...container.querySelectorAll('button')].find(
			(button) => button.textContent?.includes('NETWORK')
		);
		networkFilter?.click();

		expect(container.textContent).toContain('Network blocked');
		expect(container.textContent).not.toContain('IAB preferences saved');

		expect(container.textContent).toContain('Payload');
		expect(container.textContent).toContain('https://example.com');
	});
});
