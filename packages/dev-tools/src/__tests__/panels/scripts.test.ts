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

	it('renders expandable script activity details for each script', () => {
		const state = createBaseState({
			scripts: [
				{
					id: 'analytics',
					category: 'measurement',
				},
			],
		});

		renderScriptsPanel(container, {
			getState: () => state,
			getEvents: () => [
				{
					id: 'script-1',
					type: 'script',
					message: 'onBeforeLoad completed',
					timestamp: new Date('2026-04-10T18:00:00.000Z').valueOf(),
					data: {
						scriptId: 'analytics',
						scope: 'lifecycle',
					},
				},
				{
					id: 'script-2',
					type: 'script',
					message: 'Executed pushToQueue',
					timestamp: new Date('2026-04-10T18:00:01.000Z').valueOf(),
					data: {
						scriptId: 'analytics',
						scope: 'phase',
						callback: 'onBeforeLoad',
						phase: 'setup',
						stepType: 'pushToQueue',
					},
				},
			],
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
			scripts: [
				{
					id: 'google-tag-manager',
					category: 'necessary',
				},
			],
			loadedScripts: {
				'google-tag-manager': true,
			},
		});

		renderScriptsPanel(container, {
			getState: () => state,
			getEvents: () => [
				{
					id: '6',
					type: 'script',
					message: 'Script marked as loaded',
					timestamp: 6,
					data: {
						scriptId: 'google-tag-manager',
						scope: 'lifecycle',
					},
				},
				{
					id: '5',
					type: 'script',
					message: 'Script element appended to head',
					timestamp: 5,
					data: {
						scriptId: 'google-tag-manager',
						scope: 'lifecycle',
					},
				},
				{
					id: '4',
					type: 'script',
					message: 'onBeforeLoad completed',
					timestamp: 4,
					data: {
						scriptId: 'google-tag-manager',
						scope: 'lifecycle',
						callback: 'onBeforeLoad',
					},
				},
				{
					id: '3',
					type: 'script',
					message: 'Manifest phase setup completed',
					timestamp: 3,
					data: {
						scriptId: 'google-tag-manager',
						scope: 'phase',
						callback: 'onBeforeLoad',
						phase: 'setup',
					},
				},
				{
					id: '2',
					type: 'script',
					message: 'Manifest phase consent-default started',
					timestamp: 2,
					data: {
						scriptId: 'google-tag-manager',
						scope: 'phase',
						callback: 'onBeforeLoad',
						phase: 'consent-default',
					},
				},
				{
					id: '1',
					type: 'script',
					message: 'Manifest phase bootstrap completed',
					timestamp: 1,
					data: {
						scriptId: 'google-tag-manager',
						scope: 'phase',
						callback: 'onBeforeLoad',
						phase: 'bootstrap',
					},
				},
			],
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
					id: 'analytics',
					category: 'measurement',
				},
			],
		});

		renderScriptsPanel(container, {
			getState: () => state,
			getEvents: () =>
				Array.from({ length: 10 }, (_, index) => ({
					id: `script-${index + 1}`,
					type: 'script' as const,
					message: `event-${index + 1}`,
					timestamp: index + 1,
					data: {
						scriptId: 'analytics',
						scope: 'lifecycle',
						callback: 'onBeforeLoad',
					},
				})),
		});

		const toggle = container.querySelector(
			'button[aria-label="Expand analytics activity"]'
		) as HTMLButtonElement | null;
		toggle?.click();

		const text = container.textContent ?? '';
		expect(text).not.toContain('event-101:00:00.001');
		expect(text).not.toContain('event-201:00:00.002');
		expect(text).toContain('event-3');
		expect(text).toContain('event-10');
	});
});
