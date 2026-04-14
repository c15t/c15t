/**
 * Runner for the generate state machine
 *
 * Creates and runs the generate machine with proper setup.
 */

import { createActor } from 'xstate';
import type { StorageMode } from '~/constants';
import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';
import {
	clearSnapshot,
	createPersistenceSubscriber,
	getPersistPath,
	hasPersistedState,
	loadSnapshot,
} from '../persistence';
import {
	combineSubscribers,
	createDebugSubscriber,
	createTelemetrySubscriber,
} from '../telemetry-plugin';
import type { MachineExecutionResult } from '../types';
import { generateMachine } from './machine';
import type { GenerateMachineContext } from './types';

function getSetupTrigger(
	modeArg: StorageMode | undefined,
	resumed: boolean
): 'resume' | 'arg' | 'interactive' {
	if (resumed) {
		return 'resume';
	}

	if (modeArg) {
		return 'arg';
	}

	return 'interactive';
}

function normalizeSetupReason(
	finalState: string,
	finalContext: GenerateMachineContext
): string | undefined {
	if (finalState === 'complete') {
		return undefined;
	}

	if (
		finalState === 'preflightError' ||
		(!finalContext.preflightPassed &&
			finalContext.preflightChecks.some((check) => check.status === 'fail'))
	) {
		return 'preflight_failed';
	}

	if (finalState === 'exited' || finalState === 'cancelled') {
		const reason = finalContext.cancelReason?.toLowerCase();

		if (!reason) {
			return 'user_cancelled';
		}

		if (reason.includes('signal')) {
			return 'signal_interrupted';
		}

		if (reason.includes('mode selection')) {
			return 'mode_selection_cancelled';
		}

		if (reason.includes('hosted setup')) {
			return 'hosted_setup_cancelled';
		}

		if (reason.includes('backend options')) {
			return 'backend_options_cancelled';
		}

		if (reason.includes('frontend options')) {
			return 'frontend_options_cancelled';
		}

		if (reason.includes('scripts option')) {
			return 'scripts_options_cancelled';
		}

		return 'user_cancelled';
	}

	const lastError = finalContext.errors[finalContext.errors.length - 1];

	if (lastError?.state) {
		return `${lastError.state}_failed`;
	}

	return 'machine_error';
}

/**
 * Options for running the generate machine
 */
export interface RunGenerateOptions {
	/** CLI context */
	context: CliContext;
	/** Mode passed as CLI argument */
	modeArg?: StorageMode;
	/** Whether to resume from persisted state */
	resume?: boolean;
	/** Enable debug logging */
	debug?: boolean;
	/** Enable state persistence */
	persist?: boolean;
}

/**
 * Run the generate state machine
 *
 * @param options - Options for running the machine
 * @returns Promise that resolves when the machine completes
 */
export async function runGenerateMachine(
	options: RunGenerateOptions
): Promise<MachineExecutionResult<GenerateMachineContext>> {
	const {
		context: cliContext,
		modeArg,
		resume = false,
		debug = false,
		persist = true,
	} = options;

	const { logger, telemetry } = cliContext;
	const startTime = Date.now();
	const persistPath = getPersistPath(cliContext.projectRoot);
	const machineId = 'generate';

	// Check for persisted state if resuming
	let snapshot: unknown;
	if (resume) {
		const hasPersisted = await hasPersistedState(persistPath);
		if (hasPersisted) {
			snapshot = await loadSnapshot(persistPath, machineId);
			if (snapshot) {
				logger.info('Resuming from previous state...');
			}
		}
	}

	// Create the actor
	const actor = createActor(generateMachine, {
		input: { cliContext, modeArg },
		...(snapshot ? { snapshot: snapshot as never } : {}),
	});

	// Set up subscribers
	const subscribers: Array<(snapshot: unknown) => void> = [];

	// Telemetry subscriber
	subscribers.push(
		createTelemetrySubscriber({
			telemetry,
			machineId,
			skipStates: ['routeToMode'], // Transient state
		}) as (snapshot: unknown) => void
	);

	// Debug subscriber
	if (debug) {
		subscribers.push(
			createDebugSubscriber(machineId, logger) as (snapshot: unknown) => void
		);
	}

	// Persistence subscriber
	if (persist) {
		subscribers.push(
			createPersistenceSubscriber(machineId, persistPath) as (
				snapshot: unknown
			) => void
		);
	}

	// Combine and subscribe
	const combinedSubscriber = combineSubscribers(
		...(subscribers as Array<
			(snapshot: { value: unknown; context?: unknown }) => void
		>)
	);
	actor.subscribe((snapshot) => combinedSubscriber(snapshot));

	// Track start
	telemetry.trackEvent(TelemetryEventName.ONBOARDING_STARTED, {
		resumed: resume && snapshot !== undefined,
		trigger: getSetupTrigger(modeArg, resume && snapshot !== undefined),
		requestedMode: modeArg ?? undefined,
	});
	telemetry.flushSync();

	// Start the actor
	actor.start();

	// If not resuming, send START event
	if (!snapshot) {
		actor.send({ type: 'START' });
	}

	// Wait for completion
	return new Promise((resolve) => {
		actor.subscribe({
			complete: () => {
				const finalSnapshot = actor.getSnapshot();
				const finalContext = finalSnapshot.context;
				const finalState = String(finalSnapshot.value);
				const duration = Date.now() - startTime;

				// Clear persisted state on completion
				clearSnapshot(persistPath).catch(() => {});

				// Only the explicit "complete" state is a successful outcome.
				// Other terminal states (for example "exited") represent cancel/error exits.
				const success = finalState === 'complete';
				const durationMs = duration;
				const reason = normalizeSetupReason(finalState, finalContext);
				const result = success
					? 'success'
					: finalState === 'exited'
						? 'cancelled'
						: 'failed';

				telemetry.trackEvent(TelemetryEventName.ONBOARDING_COMPLETED, {
					success,
					result,
					reason,
					trigger: getSetupTrigger(modeArg, resume && snapshot !== undefined),
					resumed: resume && snapshot !== undefined,
					selectedMode: finalContext.selectedMode ?? undefined,
					hostedProvider: finalContext.hostedProvider ?? undefined,
					installDependencies: finalContext.installSucceeded,
					installConfirmed: finalContext.installConfirmed,
					installAttempted: finalContext.installAttempted,
					installSucceeded: finalContext.installSucceeded,
					dependencyCount: finalContext.dependenciesToAdd.length,
					filesCreatedCount: finalContext.filesCreated.length,
					filesModifiedCount: finalContext.filesModified.length,
					errorsCount: finalContext.errors.length,
					cancelReason: finalContext.cancelReason ?? undefined,
					duration,
					durationMs,
					finalState,
				});

				resolve({
					success,
					context: finalContext,
					finalState,
					duration,
					errors: finalContext.errors,
				});
			},
		});
	});
}

/**
 * Cancel signal handler for graceful shutdown
 *
 * @param actor - The running actor to cancel
 */
export function setupCancelHandler(
	actor: ReturnType<typeof createActor<typeof generateMachine>>
): void {
	const handleSignal = () => {
		actor.send({ type: 'CANCEL', reason: 'Interrupted by signal' });
	};

	process.on('SIGINT', handleSignal);
	process.on('SIGTERM', handleSignal);

	// Clean up handlers when actor completes
	actor.subscribe({
		complete: () => {
			process.off('SIGINT', handleSignal);
			process.off('SIGTERM', handleSignal);
		},
	});
}
