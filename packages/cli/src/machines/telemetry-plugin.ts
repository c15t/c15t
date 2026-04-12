/**
 * Telemetry plugin for XState machines
 *
 * Automatically tracks state transitions and events for analytics.
 */

import type { Telemetry } from '~/utils/telemetry';
import { TelemetryEventName } from '~/utils/telemetry';
import type { GenerateMachineContext } from './generate/types';
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

const GENERATE_STAGE_NAMES: Record<string, string> = {
	preflight: 'preflight',
	preflightError: 'preflight',
	modeSelection: 'mode_selection',
	hostedMode: 'hosted_mode',
	offlineMode: 'offline_mode',
	customMode: 'custom_mode',
	backendOptions: 'backend_options',
	frontendOptions: 'frontend_options',
	scriptsOptions: 'scripts_options',
	fileGeneration: 'file_generation',
	dependencyCheck: 'dependency_check',
	dependencyConfirm: 'dependency_confirm',
	dependencyInstall: 'dependency_install',
	summary: 'summary',
	skillsInstall: 'skills_install',
	githubStar: 'github_star',
	cancelling: 'cancelling',
	cleanup: 'cleanup',
	complete: 'complete',
	error: 'error',
	exited: 'exited',
	cancelled: 'cancelled',
};

function normalizeGenerateStageName(state: string): string {
	return (
		GENERATE_STAGE_NAMES[state] ??
		state.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)
	);
}

function getGenerateContext(
	snapshot: MachineSnapshot
): Partial<GenerateMachineContext> | undefined {
	return snapshot.context as Partial<GenerateMachineContext> | undefined;
}

function normalizeCancelReason(reason?: string | null): string {
	if (!reason) {
		return 'user_cancelled';
	}

	const normalized = reason.toLowerCase();

	if (normalized.includes('signal')) {
		return 'signal_interrupted';
	}
	if (normalized.includes('mode selection')) {
		return 'mode_selection_cancelled';
	}
	if (normalized.includes('hosted setup')) {
		return 'hosted_setup_cancelled';
	}
	if (normalized.includes('backend options')) {
		return 'backend_options_cancelled';
	}
	if (normalized.includes('frontend options')) {
		return 'frontend_options_cancelled';
	}
	if (normalized.includes('scripts option')) {
		return 'scripts_options_cancelled';
	}
	if (normalized.includes('dependency')) {
		return 'dependency_install_cancelled';
	}
	if (normalized.includes('prompt cancelled at stage:')) {
		return normalized
			.replace('prompt cancelled at stage:', '')
			.trim()
			.replace(/\s+/g, '_')
			.concat('_cancelled');
	}

	return 'user_cancelled';
}

function getStageReason(
	fromState: string,
	toState: string,
	context?: Partial<GenerateMachineContext>
): string | undefined {
	if (toState === 'preflightError') {
		return 'preflight_failed';
	}

	if (
		toState === 'cancelling' ||
		toState === 'cancelled' ||
		toState === 'exited'
	) {
		return normalizeCancelReason(context?.cancelReason);
	}

	if (
		fromState === 'dependencyInstall' &&
		context?.installSucceeded === false
	) {
		return 'dependency_install_failed';
	}

	if (toState === 'error') {
		const lastError = context?.errors?.[context.errors.length - 1];

		if (lastError?.state === 'fileGeneration') {
			return 'file_generation_failed';
		}

		if (lastError?.error?.name === 'PromptCancelledError') {
			return normalizeCancelReason(lastError.error.message);
		}

		if (lastError?.state) {
			return `${normalizeGenerateStageName(lastError.state)}_failed`;
		}

		return 'machine_error';
	}

	return undefined;
}

function getStageResult(
	fromState: string,
	toState: string,
	context?: Partial<GenerateMachineContext>
): 'completed' | 'failed' | 'cancelled' {
	if (toState === 'preflightError' || toState === 'error') {
		return 'failed';
	}

	if (
		toState === 'cancelling' ||
		toState === 'cancelled' ||
		toState === 'exited'
	) {
		return 'cancelled';
	}

	if (
		fromState === 'dependencyInstall' &&
		context?.installSucceeded === false
	) {
		return 'failed';
	}

	return 'completed';
}

function buildGenerateStageTelemetry(
	fromState: string,
	toState: string,
	durationMs: number,
	snapshot: MachineSnapshot
) {
	const context = getGenerateContext(snapshot);

	return {
		stage: normalizeGenerateStageName(fromState),
		nextStage: normalizeGenerateStageName(toState),
		durationMs,
		result: getStageResult(fromState, toState, context),
		reason: getStageReason(fromState, toState, context),
		selectedMode: context?.selectedMode ?? undefined,
		hostedProvider: context?.hostedProvider ?? undefined,
		dependencyCount: context?.dependenciesToAdd?.length ?? 0,
		filesCreatedCount: context?.filesCreated?.length ?? 0,
		filesModifiedCount: context?.filesModified?.length ?? 0,
		installConfirmed: context?.installConfirmed ?? undefined,
		installAttempted: context?.installAttempted ?? undefined,
		installSucceeded: context?.installSucceeded ?? undefined,
		errorsCount: context?.errors?.length ?? 0,
	};
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

			if (machineId === 'generate') {
				telemetry.trackEvent(
					TelemetryEventName.ONBOARDING_STAGE,
					buildGenerateStageTelemetry(
						lastState,
						currentState,
						duration,
						snapshot
					)
				);
			}
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
