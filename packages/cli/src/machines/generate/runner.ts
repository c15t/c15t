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
	rehydrateSnapshot,
} from '../persistence';
import {
	combineSubscribers,
	createDebugSubscriber,
	createTelemetrySubscriber,
} from '../telemetry-plugin';
import type { MachineExecutionResult } from '../types';
import { recoverGeneration, clearGenerationJournal } from './journal';
import { generateMachine } from './machine';
import type { GenerateMachineContext } from './types';

/**
 * Cancel signal handler for graceful shutdown
 *
 * @param actor - The running actor to cancel
 */
export const setupCancelHandler = function setupCancelHandler(
	actor: ReturnType<typeof createActor<typeof generateMachine>>
): void {
	const handleSignal = () => {
		actor.send({ reason: 'Interrupted by signal', type: 'CANCEL' });
	};

	process.on('SIGINT', handleSignal);
	process.on('SIGTERM', handleSignal);

	const cleanup = () => {
		process.off('SIGINT', handleSignal);
		process.off('SIGTERM', handleSignal);
	};
	actor.subscribe({ complete: cleanup, error: cleanup });
};

const getSetupTrigger = function getSetupTrigger(
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
};

const normalizeSetupReason = function normalizeSetupReason(
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
};

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
// oxlint-disable-next-line complexity -- Coordinates actor lifecycle, persistence and completion reporting.
export const runGenerateMachine = async function runGenerateMachine(
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
	const recovered = await recoverGeneration(cliContext.projectRoot, resume);
	if (recovered) {
		await clearSnapshot(persistPath);
		logger.info(
			'Restored interrupted file edits. Restarting setup so every change can be planned again.'
		);
	}

	// Check for persisted state if resuming
	let snapshot:
		| ReturnType<
				ReturnType<
					typeof createActor<typeof generateMachine>
				>['getPersistedSnapshot']
		  >
		| undefined;
	if (resume) {
		const hasPersisted = await hasPersistedState(persistPath);
		if (hasPersisted) {
			const saved = await loadSnapshot<
				ReturnType<typeof generateMachine.getPersistedSnapshot>
			>(persistPath, machineId);
			if (
				saved &&
				typeof saved === 'object' &&
				'context' in saved &&
				saved.context &&
				typeof saved.context === 'object' &&
				'projectRoot' in saved.context &&
				saved.context.projectRoot === cliContext.projectRoot
			) {
				rehydrateSnapshot(saved, cliContext);
				snapshot = saved;
			}
			if (snapshot) {
				logger.info('Resuming from previous state...');
			}
		}
	}

	// Create the actor
	const actorOptions = {
		input: { cliContext, modeArg },
	};
	if (snapshot) {
		Object.assign(actorOptions, { snapshot });
	}
	const actor = createActor(generateMachine, actorOptions);

	// Set up subscribers
	const subscribers: ((snapshot: unknown) => void)[] = [];

	// Telemetry subscriber
	subscribers.push(
		createTelemetrySubscriber({
			machineId,
			// Transient state
			skipStates: ['routeToMode'],
			telemetry,
		}) as (snapshot: unknown) => void
	);

	// Debug subscriber
	if (debug) {
		subscribers.push(
			createDebugSubscriber(machineId, logger) as (snapshot: unknown) => void
		);
	}

	// Persistence subscriber
	const persistence = createPersistenceSubscriber(machineId, persistPath);
	if (persist) {
		subscribers.push(() =>
			persistence({
				...actor.getPersistedSnapshot(),
				value: actor.getSnapshot().value,
			})
		);
	}

	// Combine and subscribe
	const combinedSubscriber = combineSubscribers(
		...(subscribers as ((currentSnapshot: {
			value: unknown;
			context?: unknown;
		}) => void)[])
	);
	actor.subscribe((currentSnapshot) => combinedSubscriber(currentSnapshot));

	// Track start
	telemetry.trackEvent(TelemetryEventName.ONBOARDING_STARTED, {
		requestedMode: modeArg ?? undefined,
		resumed: resume && snapshot !== undefined,
		trigger: getSetupTrigger(modeArg, resume && snapshot !== undefined),
	});
	telemetry.flushSync();

	// Wait for completion
	return new Promise((resolve, reject) => {
		actor.subscribe({
			complete: async () => {
				try {
					const finalSnapshot = actor.getSnapshot();
					const finalContext = finalSnapshot.context;
					const finalState = String(finalSnapshot.value);
					const duration = Date.now() - startTime;

					await persistence.flush();
					await clearSnapshot(persistPath);
					if (finalState === 'complete' || finalContext.cleanupDone) {
						await clearGenerationJournal(cliContext.projectRoot);
					}

					// Only the explicit "complete" state is a successful outcome.
					// Other terminal states (for example "exited") represent cancel/error exits.
					const success = finalState === 'complete';
					const durationMs = duration;
					const reason = normalizeSetupReason(finalState, finalContext);
					// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
					const result = success
						? 'success'
						: finalState === 'exited'
							? 'cancelled'
							: 'failed';

					telemetry.trackEvent(TelemetryEventName.ONBOARDING_COMPLETED, {
						cancelReason: finalContext.cancelReason ?? undefined,
						dependencyCount: finalContext.dependenciesToAdd.length,
						duration,
						durationMs,
						errorsCount: finalContext.errors.length,
						filesCreatedCount: finalContext.filesCreated.length,
						filesModifiedCount: finalContext.filesModified.length,
						finalState,
						hostedProvider: finalContext.hostedProvider ?? undefined,
						installAttempted: finalContext.installAttempted,
						installConfirmed: finalContext.installConfirmed,
						installDependencies: finalContext.installSucceeded,
						installSucceeded: finalContext.installSucceeded,
						reason,
						result,
						resumed: resume && snapshot !== undefined,
						selectedMode: finalContext.selectedMode ?? undefined,
						success,
						trigger: getSetupTrigger(modeArg, resume && snapshot !== undefined),
					});

					resolve({
						context: finalContext,
						duration,
						errors: finalContext.errors,
						finalState,
						success,
					});
				} catch (error) {
					reject(error);
				}
			},
			error: reject,
		});
		setupCancelHandler(actor);
		actor.start();
		if (!snapshot) {
			actor.send({ type: 'START' });
		}
	});
};
