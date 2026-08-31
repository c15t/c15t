import type { ConsentStoreState } from '@c15t/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderScriptsPanel } from '../../panels/scripts';

const createBaseState = function createBaseState(
	overrides: Partial<ConsentStoreState>
): ConsentStoreState {
	return {
		consents: {},
		has: vi.fn(() => false),
		loadedScripts: {},
		scripts: [],
		...overrides,
	} as unknown as ConsentStoreState;
};

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
					category: condition,
					id: 'analytics',
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
					category: {
						or: ['measurement', 'marketing'],
					} as unknown as ConsentStoreState['scripts'][number]['category'],
					id: 'analytics',
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
			getEvents: () =>
				[
					{
						data: {
							method: 'GET',
							rule: { id: 'facebook-pixel' },

							url: 'https://example.com/pixel',
						},

						id: '1',
						message: 'Network blocked: GET https://example.com/pixel',
						timestamp: Date.now(),
						type: 'network',
					},
				] as const,
			getState: () => state,
		});

		expect(container.textContent).toContain('Blocked Requests (1)');
		expect(container.textContent).toContain('facebook-pixel');
	});

	it('renders expandable script activity details for each script', () => {
		const state = createBaseState({
			scripts: [
				{
					category: 'measurement',
					id: 'analytics',
				},
			],
		});

		renderScriptsPanel(container, {
			getEvents: () => [
				{
					data: {
						scope: 'lifecycle',

						scriptId: 'analytics',
					},

					id: 'script-1',
					message: 'onBeforeLoad completed',
					timestamp: new Date('2026-04-10T18:00:00.000Z').valueOf(),
					type: 'script',
				},
				{
					data: {
						callback: 'onBeforeLoad',
						phase: 'setup',
						scope: 'phase',
						scriptId: 'analytics',
						stepType: 'pushToQueue',
					},

					id: 'script-2',
					message: 'Executed pushToQueue',
					timestamp: new Date('2026-04-10T18:00:01.000Z').valueOf(),
					type: 'script',
				},
			],
			getState: () => state,
		});

		expect(container.textContent).toContain(
			'Activity: Executed pushToQueue (2 events)'
		);

		const toggle = container.querySelector(
			'button[aria-label="Expand analytics activity"]'
		) as HTMLButtonElement | null;
		expect(toggle).not.toBeNull();

		toggle?.click();

		expect(container.textContent).toContain('onBeforeLoad');
		expect(container.textContent).toContain('Executed pushToQueue');
		expect(container.textContent).toContain('phase / setup / pushToQueue');
		expect(container.textContent).toContain('.000');
	});

	it('orders grouped activity as timeline phases, oldest to newest', () => {
		const state = createBaseState({
			loadedScripts: {
				'google-tag-manager': true,
			},
			scripts: [
				{
					category: 'necessary',

					id: 'google-tag-manager',
				},
			],
		});

		renderScriptsPanel(container, {
			getEvents: () => [
				{
					data: {
						scope: 'lifecycle',

						scriptId: 'google-tag-manager',
					},

					id: '6',
					message: 'Script marked as loaded',
					timestamp: 6,
					type: 'script',
				},
				{
					data: {
						scope: 'lifecycle',

						scriptId: 'google-tag-manager',
					},

					id: '5',
					message: 'Script element appended to head',
					timestamp: 5,
					type: 'script',
				},
				{
					data: {
						callback: 'onBeforeLoad',

						scope: 'lifecycle',
						scriptId: 'google-tag-manager',
					},

					id: '4',
					message: 'onBeforeLoad completed',
					timestamp: 4,
					type: 'script',
				},
				{
					data: {
						callback: 'onBeforeLoad',
						phase: 'setup',

						scope: 'phase',
						scriptId: 'google-tag-manager',
					},

					id: '3',
					message: 'Manifest phase setup completed',
					timestamp: 3,
					type: 'script',
				},
				{
					data: {
						callback: 'onBeforeLoad',
						phase: 'consent-default',

						scope: 'phase',
						scriptId: 'google-tag-manager',
					},

					id: '2',
					message: 'Manifest phase consent-default started',
					timestamp: 2,
					type: 'script',
				},
				{
					data: {
						callback: 'onBeforeLoad',
						phase: 'bootstrap',

						scope: 'phase',
						scriptId: 'google-tag-manager',
					},

					id: '1',
					message: 'Manifest phase bootstrap completed',
					timestamp: 1,
					type: 'script',
				},
			],
			getState: () => state,
		});

		const toggle = container.querySelector(
			'button[aria-label="Expand google-tag-manager activity"]'
		) as HTMLButtonElement | null;
		toggle?.click();

		const text = container.textContent ?? '';
		expect(text.indexOf('onBeforeLoad')).toBeLessThan(text.indexOf('other'));
		expect(text.indexOf('Manifest phase bootstrap completed')).toBeLessThan(
			text.indexOf('Manifest phase setup completed')
		);
		expect(text.indexOf('Script element appended to head')).toBeLessThan(
			text.lastIndexOf('Script marked as loaded')
		);
	});

	it('shows the most recent eight activity events in the accordion', () => {
		const state = createBaseState({
			scripts: [
				{
					category: 'measurement',
					id: 'analytics',
				},
			],
		});

		renderScriptsPanel(container, {
			getEvents: () =>
				Array.from({ length: 10 }, (_, index) => ({
					data: {
						callback: 'onBeforeLoad',

						scope: 'lifecycle',
						scriptId: 'analytics',
					},

					id: `script-${index + 1}`,
					message: `event-${index + 1}`,
					timestamp: index + 1,
					type: 'script' as const,
				})),
			getState: () => state,
		});

		const toggle = container.querySelector(
			'button[aria-label="Expand analytics activity"]'
		) as HTMLButtonElement | null;
		toggle?.click();

		const text = container.textContent ?? '';
		expect(text).not.toMatch(/event-1(?!0)/u);
		expect(text).not.toContain('event-2');
		expect(text).toContain('event-3');
		expect(text).toContain('event-10');
	});
});
