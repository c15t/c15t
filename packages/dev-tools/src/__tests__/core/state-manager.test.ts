import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createStateManager,
	type StateManager,
} from '../../core/state-manager';

describe('createStateManager', () => {
	let stateManager: StateManager;
	let mockSessionStorage: Record<string, string>;
	let mockLocalStorage: Record<string, string>;

	beforeEach(() => {
		// Reset sessionStorage mock
		mockSessionStorage = {};
		mockLocalStorage = {};
		vi.stubGlobal('sessionStorage', {
			getItem: vi.fn((key: string) => mockSessionStorage[key] ?? null),
			setItem: vi.fn((key: string, value: string) => {
				mockSessionStorage[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete mockSessionStorage[key];
			}),
		});
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
			setItem: vi.fn((key: string, value: string) => {
				mockLocalStorage[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete mockLocalStorage[key];
			}),
		});

		stateManager = createStateManager();
	});

	describe('initial state', () => {
		it('should have default values', () => {
			const state = stateManager.getState();

			expect(state.isOpen).toBe(false);
			expect(state.activeTab).toBe('location');
			expect(state.position).toBe('bottom-right');
			expect(state.isConnected).toBe(false);
			expect(state.eventLog).toEqual([]);
			expect(state.maxEventLogSize).toBe(100);
		});

		it('should accept initial state overrides', () => {
			const customManager = createStateManager({
				isOpen: true,
				activeTab: 'consents',
				position: 'top-left',
			});

			const state = customManager.getState();
			expect(state.isOpen).toBe(true);
			expect(state.activeTab).toBe('consents');
			expect(state.position).toBe('top-left');
		});

		it('should load persisted active tab from localStorage', () => {
			mockLocalStorage['c15t-devtools-active-tab'] = 'events';
			const managerWithPersistedTab = createStateManager();
			expect(managerWithPersistedTab.getState().activeTab).toBe('events');
		});

		it('should load persisted events from sessionStorage', () => {
			const persistedEvents = [
				{
					id: 'test-1',
					type: 'info' as const,
					message: 'Test event',
					timestamp: Date.now(),
				},
			];
			mockSessionStorage['c15t-devtools-events'] =
				JSON.stringify(persistedEvents);

			const newManager = createStateManager();
			expect(newManager.getState().eventLog).toHaveLength(1);
			expect(newManager.getState().eventLog[0]?.message).toBe('Test event');
		});
	});

	describe('setOpen', () => {
		it('should update isOpen state', () => {
			stateManager.setOpen(true);
			expect(stateManager.getState().isOpen).toBe(true);

			stateManager.setOpen(false);
			expect(stateManager.getState().isOpen).toBe(false);
		});
	});

	describe('toggle', () => {
		it('should toggle isOpen state', () => {
			expect(stateManager.getState().isOpen).toBe(false);

			stateManager.toggle();
			expect(stateManager.getState().isOpen).toBe(true);

			stateManager.toggle();
			expect(stateManager.getState().isOpen).toBe(false);
		});
	});

	describe('setActiveTab', () => {
		it('should update activeTab', () => {
			stateManager.setActiveTab('scripts');
			expect(stateManager.getState().activeTab).toBe('scripts');

			stateManager.setActiveTab('iab');
			expect(stateManager.getState().activeTab).toBe('iab');
		});

		it('should persist active tab to localStorage', () => {
			stateManager.setActiveTab('actions');
			expect(localStorage.setItem).toHaveBeenCalledWith(
				'c15t-devtools-active-tab',
				'actions'
			);
		});
	});

	describe('setPosition', () => {
		it('should update position', () => {
			stateManager.setPosition('top-left');
			expect(stateManager.getState().position).toBe('top-left');

			stateManager.setPosition('bottom-left');
			expect(stateManager.getState().position).toBe('bottom-left');
		});
	});

	describe('setConnected', () => {
		it('should update isConnected', () => {
			stateManager.setConnected(true);
			expect(stateManager.getState().isConnected).toBe(true);

			stateManager.setConnected(false);
			expect(stateManager.getState().isConnected).toBe(false);
		});
	});

	describe('addEvent', () => {
		it('should add events to the log', () => {
			stateManager.addEvent({
				type: 'info',
				message: 'Test event',
			});

			const events = stateManager.getState().eventLog;
			expect(events).toHaveLength(1);
			expect(events[0]?.message).toBe('Test event');
			expect(events[0]?.type).toBe('info');
		});

		it('should generate unique IDs for events', () => {
			stateManager.addEvent({ type: 'info', message: 'Event 1' });
			stateManager.addEvent({ type: 'info', message: 'Event 2' });

			const events = stateManager.getState().eventLog;
			expect(events[0]?.id).not.toBe(events[1]?.id);
		});

		it('should add timestamp to events', () => {
			const beforeTime = Date.now();
			stateManager.addEvent({ type: 'info', message: 'Test' });
			const afterTime = Date.now();

			const event = stateManager.getState().eventLog[0];
			expect(event?.timestamp).toBeGreaterThanOrEqual(beforeTime);
			expect(event?.timestamp).toBeLessThanOrEqual(afterTime);
		});

		it('should keep newest events at the beginning', () => {
			stateManager.addEvent({ type: 'info', message: 'First' });
			stateManager.addEvent({ type: 'info', message: 'Second' });
			stateManager.addEvent({ type: 'info', message: 'Third' });

			const events = stateManager.getState().eventLog;
			expect(events[0]?.message).toBe('Third');
			expect(events[1]?.message).toBe('Second');
			expect(events[2]?.message).toBe('First');
		});

		it('should respect maxEventLogSize limit', () => {
			const manager = createStateManager({ maxEventLogSize: 3 });

			manager.addEvent({ type: 'info', message: '1' });
			manager.addEvent({ type: 'info', message: '2' });
			manager.addEvent({ type: 'info', message: '3' });
			manager.addEvent({ type: 'info', message: '4' });

			const events = manager.getState().eventLog;
			expect(events).toHaveLength(3);
			expect(events[0]?.message).toBe('4');
		});

		it('should persist events to sessionStorage', () => {
			stateManager.addEvent({ type: 'info', message: 'Persisted event' });

			expect(sessionStorage.setItem).toHaveBeenCalled();
		});
	});

	describe('clearEventLog', () => {
		it('should clear all events', () => {
			stateManager.addEvent({ type: 'info', message: 'Event 1' });
			stateManager.addEvent({ type: 'info', message: 'Event 2' });

			expect(stateManager.getState().eventLog).toHaveLength(2);

			stateManager.clearEventLog();

			expect(stateManager.getState().eventLog).toHaveLength(0);
		});

		it('should persist empty array to sessionStorage', () => {
			stateManager.addEvent({ type: 'info', message: 'Event' });
			stateManager.clearEventLog();

			// Last call should persist empty array
			expect(sessionStorage.setItem).toHaveBeenLastCalledWith(
				'c15t-devtools-events',
				'[]'
			);
		});
	});

	describe('subscribe', () => {
		it('should notify listeners of state changes', () => {
			const listener = vi.fn();
			stateManager.subscribe(listener);

			stateManager.setOpen(true);

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({ isOpen: true }),
				expect.objectContaining({ isOpen: false })
			);
		});

		it('should return unsubscribe function', () => {
			const listener = vi.fn();
			const unsubscribe = stateManager.subscribe(listener);

			stateManager.setOpen(true);
			expect(listener).toHaveBeenCalledTimes(1);

			unsubscribe();
			stateManager.setOpen(false);

			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('should support multiple listeners', () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			stateManager.subscribe(listener1);
			stateManager.subscribe(listener2);

			stateManager.setOpen(true);

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});
	});

	describe('destroy', () => {
		it('should clear all listeners', () => {
			const listener = vi.fn();
			stateManager.subscribe(listener);

			stateManager.destroy();
			stateManager.setOpen(true);

			expect(listener).not.toHaveBeenCalled();
		});
	});
});
