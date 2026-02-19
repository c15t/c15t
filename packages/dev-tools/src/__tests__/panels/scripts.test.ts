import type { ConsentStoreState } from 'c15t';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScriptsPanel } from '../../panels/scripts';

function createBaseState(
	overrides: Partial<ConsentStoreState>
): ConsentStoreState {
	return {
		scripts: [],
		loadedScripts: {},
		consents: {},
		has: vi.fn(() => false),
		...overrides,
	} as unknown as ConsentStoreState;
}

describe('scripts panel', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
	});

	it('evaluates complex HasCondition values via store.has()', () => {
		const has = vi.fn(() => true);
		const condition = {
			and: ['measurement', 'marketing'],
		} as unknown as ConsentStoreState['scripts'][number]['category'];
		const state = createBaseState({
			has,
			scripts: [
				{
					id: 'analytics',
					category: condition,
				},
			],
		});

		renderScriptsPanel(container, {
			getState: () => state,
		});

		expect(has).toHaveBeenCalledWith(condition);
		expect(container.textContent).toContain('Pending');
	});

	it('shows blocked when complex condition does not pass', () => {
		const has = vi.fn(() => false);
		const state = createBaseState({
			has,
			scripts: [
				{
					id: 'analytics',
					category: {
						or: ['measurement', 'marketing'],
					} as unknown as ConsentStoreState['scripts'][number]['category'],
				},
			],
		});

		renderScriptsPanel(container, {
			getState: () => state,
		});

		expect(container.textContent).toContain('Blocked');
	});

	it('renders blocked request stats from network events', () => {
		const state = createBaseState({
			scripts: [],
		});

		renderScriptsPanel(container, {
			getState: () => state,
			getEvents: () =>
				[
					{
						id: '1',
						type: 'network',
						message: 'Network blocked: GET https://example.com/pixel',
						timestamp: Date.now(),
						data: {
							method: 'GET',
							url: 'https://example.com/pixel',
							rule: { id: 'facebook-pixel' },
						},
					},
				] as const,
		});

		expect(container.textContent).toContain('Blocked Requests (1)');
		expect(container.textContent).toContain('facebook-pixel');
	});
});
