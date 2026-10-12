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
	backendOptions: 'backend_options',
	cancelled: 'cancelled',
	cancelling: 'cancelling',
	cleanup: 'cleanup',
	complete: 'complete',
	customMode: 'custom_mode',
	dependencyCheck: 'dependency_check',
	dependencyConfirm: 'dependency_confirm',
	dependencyInstall: 'dependency_install',
	error: 'error',
	exited: 'exited',
	fileGeneration: 'file_generation',
	frontendOptions: 'frontend_options',
	githubStar: 'github_star',
	hostedMode: 'hosted_mode',
	modeSelection: 'mode_selection',
	offlineMode: 'offline_mode',
	preflight: 'preflight',
	preflightError: 'preflight',
	scriptsOptions: 'scripts_options',
	skillsInstall: 'skills_install',
	summary: 'summary',
};

const normalizeGenerateStageName = function normalizeGenerateStageName(
	state: string
): string {
	return (
		GENERATE_STAGE_NAMES[state] ??
		state.replace(/[A-Z]/gu, (char) => `_${char.toLowerCase()}`)
	);
};

const getGenerateContext = function getGenerateContext(
	snapshot: MachineSnapshot
): Partial<GenerateMachineContext> | undefined {
	return snapshot.context as Partial<GenerateMachineContext> | undefined;
};

const normalizeCancelReason = function normalizeCancelReason(
	reason?: string | null
): string {
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
			.replace(/\s+/gu, '_')
			.concat('_cancelled');
	}

	return 'user_cancelled';
};

const getStageReason = function getStageReason(
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
};

const getStageResult = function getStageResult(
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
};

const optionalLength = (values: readonly unknown[] | undefined): number =>
	values?.length ?? 0;

const buildGenerateStageTelemetry = function buildGenerateStageTelemetry(
	fromState: string,
	toState: string,
	durationMs: number,
	snapshot: MachineSnapshot
) {
	const context = getGenerateContext(snapshot);
	if (!context) {
		return {
			dependencyCount: 0,
			durationMs,
			errorsCount: 0,
			filesCreatedCount: 0,
			filesModifiedCount: 0,
			hostedProvider: undefined,
			installAttempted: undefined,
			installConfirmed: undefined,
			installSucceeded: undefined,
			nextStage: normalizeGenerateStageName(toState),
			reason: getStageReason(fromState, toState, context),
			result: getStageResult(fromState, toState, context),
			selectedMode: undefined,
			stage: normalizeGenerateStageName(fromState),
		};
	}

	return {
		dependencyCount: optionalLength(context.dependenciesToAdd),
		durationMs,
		errorsCount: optionalLength(context.errors),
		filesCreatedCount: optionalLength(context.filesCreated),
		filesModifiedCount: optionalLength(context.filesModified),
		hostedProvider: context.hostedProvider,
		installAttempted: context.installAttempted,
		installConfirmed: context.installConfirmed,
		installSucceeded: context.installSucceeded,
		nextStage: normalizeGenerateStageName(toState),
		reason: getStageReason(fromState, toState, context),
		result: getStageResult(fromState, toState, context),
		selectedMode: context.selectedMode,
		stage: normalizeGenerateStageName(fromState),
	};
};

/**
 * Creates a telemetry subscriber for a state machine
 *
 * Tracks:
 * - State entry/exit
 * - State transition timing
 * - Error states
 * - Cancellation
 */
export const createTelemetrySubscriber = function createTelemetrySubscriber(
	config: TelemetryPluginConfig
) {
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
				duration,
				fromState: lastState,
				machineId,
				toState: currentState,
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
				| { errors?: { error: Error }[] }
				| undefined;
			const errors = ctx?.errors;
			const lastError = errors?.[errors.length - 1];

			telemetry.trackEvent(TelemetryEventName.CLI_STATE_ERROR, {
				error: lastError?.error?.message ?? 'Unknown error',
				machineId,
				state: currentState,
				stateHistory: stateHistory.map((e) => e.state).join(','),
			});
		}

		if (currentState === 'exited' || currentState === 'cancelled') {
			telemetry.trackEvent(TelemetryEventName.CLI_STATE_CANCELLED, {
				lastState: lastState ?? 'unknown',
				machineId,
				stateHistory: stateHistory.map((e) => e.state).join(','),
			});
		}

		if (currentState === 'complete' || currentState === 'success') {
			const totalDuration = now - (stateHistory[0]?.timestamp ?? now);

			telemetry.trackEvent(TelemetryEventName.CLI_STATE_COMPLETE, {
				machineId,
				stateHistory: stateHistory.map((e) => e.state).join(','),
				statesVisited: stateHistory.length,
				totalDuration,
			});
		}

		lastState = currentState;
		lastStateTime = now;
	};
};

/**
 * Gets the state history from a subscriber
 * Useful for debugging and error reporting
 */
export const getStateHistory = function getStateHistory(
	_subscriber: ReturnType<typeof createTelemetrySubscriber>
): StateHistoryEntry[] {
	// The history is captured in closure, this is a placeholder
	// for accessing it through context if needed
	return [];
};

/**
 * Creates a combined subscriber that handles both telemetry and custom callbacks
 */
export const combineSubscribers = function combineSubscribers(
	...subscribers: ((snapshot: MachineSnapshot) => void)[]
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
};

/**
 * Utility to create a simple state logger for debugging
 */
export const createDebugSubscriber = function createDebugSubscriber(
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
};
