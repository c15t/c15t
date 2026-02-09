/**
 * Telemetry plugin for XState machines
 *
 * Automatically tracks state transitions and events for analytics.
 */

import type { Telemetry } from '~/utils/telemetry';
import { TelemetryEventName } from '~/utils/telemetry';
import type { StateHistoryEntry } from './types';

/**
 * Configuration for telemetry tracking
 */
export interface TelemetryPluginConfig {
	/** Telemetry instance to use */
	telemetry: Telemetry;
	/** Machine ID for event naming */
	machineId: string;
	/** States to skip tracking (e.g., transient states) */
	skipStates?: string[];
	/** Whether to track all events or just state changes */
	trackAllEvents?: boolean;
}

/**
 * Snapshot type for subscriber (loosely typed for XState compatibility)
 */
interface MachineSnapshot {
	value: unknown;
	context?: unknown;
}

/**
 * Creates a telemetry subscriber for a state machine
 *
 * Tracks:
 * - State entry/exit
 * - State transition timing
 * - Error states
 * - Cancellation
 */
export function createTelemetrySubscriber(config: TelemetryPluginConfig) {
	const { telemetry, machineId, skipStates = [] } = config;

	let lastState: string | null = null;
	let lastStateTime: number = Date.now();
	const stateHistory: StateHistoryEntry[] = [];

	return (snapshot: MachineSnapshot) => {
		const currentState = String(snapshot.value);
		const now = Date.now();

		// Skip if state hasn't changed
		if (currentState === lastState) {
			return;
		}

		// Skip transient states if configured
		if (skipStates.includes(currentState)) {
			return;
		}

		// Track state exit timing for previous state
		if (lastState !== null) {
			const duration = now - lastStateTime;

			telemetry.trackEvent(TelemetryEventName.CLI_STATE_TRANSITION, {
				machineId,
				fromState: lastState,
				toState: currentState,
				duration,
			});
		}

		// Record in history
		stateHistory.push({
			state: currentState,
			timestamp: now,
		});

		// Track specific states
		if (currentState === 'error' || currentState === 'preflightError') {
			const ctx = snapshot.context as
				| { errors?: Array<{ error: Error }> }
				| undefined;
			const errors = ctx?.errors;
			const lastError = errors?.[errors.length - 1];

			telemetry.trackEvent(TelemetryEventName.CLI_STATE_ERROR, {
				machineId,
				state: currentState,
				error: lastError?.error?.message ?? 'Unknown error',
				stateHistory: stateHistory.map((e) => e.state).join(','),
			});
		}

		if (currentState === 'exited' || currentState === 'cancelled') {
			telemetry.trackEvent(TelemetryEventName.CLI_STATE_CANCELLED, {
				machineId,
				lastState: lastState ?? 'unknown',
				stateHistory: stateHistory.map((e) => e.state).join(','),
			});
		}

		if (currentState === 'complete' || currentState === 'success') {
			const totalDuration = now - (stateHistory[0]?.timestamp ?? now);

			telemetry.trackEvent(TelemetryEventName.CLI_STATE_COMPLETE, {
				machineId,
				totalDuration,
				statesVisited: stateHistory.length,
				stateHistory: stateHistory.map((e) => e.state).join(','),
			});
		}

		lastState = currentState;
		lastStateTime = now;
	};
}

/**
 * Gets the state history from a subscriber
 * Useful for debugging and error reporting
 */
export function getStateHistory(
	subscriber: ReturnType<typeof createTelemetrySubscriber>
): StateHistoryEntry[] {
	// The history is captured in closure, this is a placeholder
	// for accessing it through context if needed
	return [];
}

/**
 * Creates a combined subscriber that handles both telemetry and custom callbacks
 */
export function combineSubscribers(
	...subscribers: Array<(snapshot: MachineSnapshot) => void>
) {
	return (snapshot: MachineSnapshot) => {
		for (const subscriber of subscribers) {
			try {
				subscriber(snapshot);
			} catch (error) {
				// Don't let subscriber errors break the machine
				console.error('Subscriber error:', error);
			}
		}
	};
}

/**
 * Utility to create a simple state logger for debugging
 */
export function createDebugSubscriber(
	machineId: string,
	logger?: { debug: (msg: string, ...args: unknown[]) => void }
) {
	let lastState: string | null = null;

	return (snapshot: MachineSnapshot) => {
		const currentState = String(snapshot.value);

		if (currentState !== lastState) {
			const log = logger?.debug ?? console.debug;
			log(`[${machineId}] State: ${lastState ?? 'initial'} -> ${currentState}`);
			lastState = currentState;
		}
	};
}
