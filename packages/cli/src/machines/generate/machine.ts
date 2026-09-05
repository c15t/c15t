/**
 * Generate command state machine
 *
 * Main state machine for the generate flow with all states, transitions, and actors.
 */

import { assign, setup } from 'xstate';

import { UMBRELLA_PACKAGE } from '~/constants';
import type { StorageMode } from '~/constants';
import type { CliContext } from '~/context/types';
import { CliError } from '~/core/errors';

import {
	checkDependenciesActor,
	dependencyInstallActor,
	getManualInstallCommand,
} from './actors/dependencies';
import { fileGenerationActor, rollbackActor } from './actors/file-generation';
import {
	displayPreflightFailure,
	displayPreflightResults,
	preflightActor,
} from './actors/preflight';
import {
	backendOptionsActor,
	frontendOptionsActor,
	githubStarActor,
	hostedModeActor,
	installConfirmActor,
	modeSelectionActor,
	PromptCancelledError,
	scriptsOptionActor,
	skillsInstallActor,
} from './actors/prompts';
import { guards } from './guards';
import { createInitialContext } from './types';
import type { GenerateMachineContext, GenerateMachineEvent } from './types';

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

const normalizeSelectedMode = function normalizeSelectedMode(
	mode: StorageMode | null | undefined
): GenerateMachineContext['selectedMode'] {
	if (mode === 'c15t' || mode === 'self-hosted') {
		return 'hosted';
	}

	return mode ?? null;
};

const getHostedProviderFromMode = function getHostedProviderFromMode(
	mode: StorageMode | null | undefined
): GenerateMachineContext['hostedProvider'] {
	if (mode === 'self-hosted') {
		return 'self-hosted';
	}
	if (mode === 'c15t') {
		return 'inth.com';
	}

	return null;
};

/**
 * The generate state machine definition
 */
export const generateMachine = setup({
	actors: {
		backendOptions: backendOptionsActor,
		checkDependencies: checkDependenciesActor,
		dependencyInstall: dependencyInstallActor,
		fileGeneration: fileGenerationActor,
		frontendOptions: frontendOptionsActor,
		githubStar: githubStarActor,
		hostedMode: hostedModeActor,
		installConfirm: installConfirmActor,
		modeSelection: modeSelectionActor,
		preflight: preflightActor,
		rollback: rollbackActor,
		scriptsOption: scriptsOptionActor,
		skillsInstall: skillsInstallActor,
	},
	guards,
	types: {
		context: {} as GenerateMachineContext,
		events: {} as GenerateMachineEvent,
		input: {} as { cliContext: CliContext; modeArg?: StorageMode },
	},
}).createMachine({
	context: ({ input }) => createInitialContext(input.cliContext, input.modeArg),
	id: 'generate',
	initial: 'idle',

	// Global cancel handler - can be triggered from any state
	on: {
		CANCEL: {
			actions: assign({
				cancelReason: ({ event }) => event.reason ?? 'User cancelled',
			}),
			target: '.cancelling',
		},
	},

	states: {
		/**
		 * Backend options (env file, proxy)
		 */
		backendOptions: {
			invoke: {
				input: ({ context }) => ({
					backendURL: getDefined(context.backendURL),
					cliContext: getDefined(context.cliContext),
				}),
				onDone: {
					actions: assign({
						proxyNextjs: ({ event }) => event.output.proxyNextjs,
						useEnvFile: ({ event }) => event.output.useEnvFile,
					}),
					target: 'frontendOptions',
				},
				onError: {
					actions: assign({
						cancelReason: 'Backend options cancelled',
					}),
					target: 'cancelling',
				},
				src: 'backendOptions',
			},
		},

		/**
		 * Cancellation handling
		 */
		cancelling: {
			always: [
				// Auto-rollback if there are files to restore
				{
					guard: 'hasFilesToRollback',
					target: 'rollback',
				},
				{
					target: 'exited',
				},
			],
			entry: ({ context }) => {
				context.cliContext?.logger.info(
					context.cancelReason ?? 'Configuration cancelled.'
				);
			},
		},

		/**
		 * Successful completion
		 */
		complete: {
			entry: ({ context }) => {
				context.cliContext?.logger.success('Setup completed successfully!');
			},
			type: 'final',
		},

		/**
		 * Custom mode setup (no backend needed)
		 */
		customMode: {
			always: 'frontendOptions',
		},

		/**
		 * Check which dependencies are already installed
		 */
		dependencyCheck: {
			invoke: {
				input: ({ context }) => ({
					dependencies: context.dependenciesToAdd,
					projectRoot: getDefined(context.cliContext).projectRoot,
				}),
				onDone: {
					actions: assign({
						dependenciesToAdd: ({ event }) => event.output.missing,
					}),
					target: 'dependencyConfirm',
				},
				onError: {
					target: 'dependencyConfirm',
				},
				src: 'checkDependencies',
			},
		},

		/**
		 * Confirm dependency installation
		 */
		dependencyConfirm: {
			always: [
				// Skip if no dependencies to install
				{
					guard: ({ context }) => context.dependenciesToAdd.length === 0,
					target: 'summary',
				},
			],
			invoke: {
				input: ({ context }) => ({
					dependencies: context.dependenciesToAdd,
					packageManager: context.packageManager?.name ?? 'npm',
				}),
				onDone: [
					{
						actions: assign({
							installConfirmed: true,
						}),
						guard: ({ event }) => event.output.confirmed,
						target: 'dependencyInstall',
					},
					{
						actions: assign({
							installConfirmed: false,
						}),
						target: 'summary',
					},
				],
				onError: {
					actions: assign({
						installConfirmed: false,
					}),
					// Don't cancel on install confirm error, just skip
					target: 'summary',
				},
				src: 'installConfirm',
			},
		},

		/**
		 * Install dependencies
		 */
		dependencyInstall: {
			invoke: {
				input: ({ context }) => ({
					cliContext: getDefined(context.cliContext),
					dependencies: context.dependenciesToAdd,
				}),
				onDone: {
					actions: assign({
						installAttempted: true,
						installSucceeded: ({ event }) => event.output.success,
					}),
					target: 'summary',
				},
				onError: {
					actions: assign({
						installAttempted: true,
						installSucceeded: false,
					}),
					target: 'summary',
				},
				src: 'dependencyInstall',
			},
		},

		/**
		 * Error state
		 */
		error: {
			always: [
				// Auto-rollback if there are files to restore
				{
					guard: 'hasFilesToRollback',
					target: 'rollback',
				},
				{
					target: 'exited',
				},
			],
			entry: ({ context }) => {
				const lastError = context.errors[context.errors.length - 1];
				const error = lastError?.error;
				const details =
					error instanceof CliError &&
					typeof error.context?.details === 'string'
						? error.context.details
						: undefined;

				context.cliContext?.logger.error(
					`Error: ${error?.message ?? 'Unknown error'}${details ? `: ${details}` : ''}`
				);
			},
		},

		/**
		 * Final exited state (after cancel/error)
		 */
		exited: {
			type: 'final',
		},

		/**
		 * File generation
		 */
		fileGeneration: {
			invoke: {
				input: ({ context }) => ({
					backendURL: context.backendURL,
					cliContext: getDefined(context.cliContext),
					enableDevTools: context.enableDevTools,
					enableSSR: context.enableSSR,
					expandedTheme: context.expandedTheme,
					mode: getDefined(context.selectedMode),
					proxyNextjs: context.proxyNextjs,
					selectedScripts: context.selectedScripts,
					uiStyle: context.uiStyle,
					useEnvFile: context.useEnvFile,
				}),
				onDone: {
					actions: assign({
						filesCreated: ({ event }) => event.output.filesCreated,
						filesModified: ({ event }) => event.output.filesModified,
					}),
					target: 'dependencyCheck',
				},
				onError: {
					actions: assign({
						errors: ({ context, event }) => [
							...context.errors,
							{
								error: event.error as Error,
								state: 'fileGeneration',
								timestamp: Date.now(),
							},
						],
					}),
					target: 'error',
				},
				src: 'fileGeneration',
			},
		},

		/**
		 * Frontend UI options (SSR, style, theme)
		 */
		frontendOptions: {
			invoke: {
				input: ({ context }) => ({
					cliContext: getDefined(context.cliContext),
					hasBackend: context.selectedMode === 'hosted',
				}),
				onDone: {
					actions: assign({
						enableDevTools: ({ event, context }) =>
							event.output.enableDevTools ?? context.enableDevTools,
						enableSSR: ({ event, context }) =>
							event.output.enableSSR ?? context.enableSSR,
						expandedTheme: ({ event }) => event.output.expandedTheme ?? null,
						uiStyle: ({ event }) => event.output.uiStyle,
					}),
					target: 'scriptsOptions',
				},
				onError: {
					actions: assign({
						cancelReason: 'Frontend options cancelled',
					}),
					target: 'cancelling',
				},
				src: 'frontendOptions',
			},
		},

		/**
		 * GitHub star prompt
		 */
		githubStar: {
			invoke: {
				input: ({ context }) => ({
					cliContext: getDefined(context.cliContext),
				}),
				onDone: 'complete',
				onError: 'complete',
				src: 'githubStar',
			},
		},

		/**
		 * c15t (hosted) mode setup
		 */
		hostedMode: {
			invoke: {
				input: ({ context }) => ({
					cliContext: getDefined(context.cliContext),
					initialURL: context.backendURL ?? undefined,
					preselectedProvider: context.hostedProvider,
				}),
				onDone: {
					actions: assign({
						backendURL: ({ event }) => event.output.url,
						hostedProvider: ({ event }) => event.output.provider,
					}),
					target: 'backendOptions',
				},
				onError: [
					{
						actions: assign({
							cancelReason: 'Hosted setup cancelled',
						}),
						guard: ({ event }) => event.error instanceof PromptCancelledError,
						target: 'cancelling',
					},
					{
						actions: assign({
							errors: ({ context, event }) => [
								...context.errors,
								{
									error: event.error as Error,
									state: 'hostedMode',
									timestamp: Date.now(),
								},
							],
						}),
						target: 'error',
					},
				],
				src: 'hostedMode',
			},
		},

		/**
		 * Initial idle state - waiting to start
		 */
		idle: {
			on: {
				START: 'preflight',
			},
		},

		/**
		 * Mode selection - prompt user or use CLI arg
		 */
		modeSelection: {
			always: [
				// Skip prompt if mode was provided as argument
				{
					actions: assign({
						hostedProvider: ({ context }) =>
							getHostedProviderFromMode(context.modeArg),
						selectedMode: ({ context }) =>
							normalizeSelectedMode(context.modeArg),
					}),
					guard: 'hasModeArg',
					target: 'routeToMode',
				},
			],
			invoke: {
				input: () => ({}),
				onDone: {
					actions: assign({
						hostedProvider: null,
						selectedMode: ({ event }) =>
							normalizeSelectedMode(event.output.mode),
					}),
					target: 'routeToMode',
				},
				onError: {
					actions: assign({
						cancelReason: 'Mode selection cancelled',
					}),
					target: 'cancelling',
				},
				src: 'modeSelection',
			},
		},

		/**
		 * Offline mode setup (no backend needed)
		 */
		offlineMode: {
			always: 'frontendOptions',
		},

		/**
		 * Run preflight checks
		 */
		preflight: {
			invoke: {
				input: ({ context }) => ({
					cliContext: getDefined(context.cliContext),
				}),
				onDone: [
					{
						actions: [
							assign({
								framework: ({ event }) => event.output.framework,
								packageManager: ({ event }) => event.output.packageManager,
								preflightChecks: ({ event }) => event.output.checks,
								preflightPassed: ({ event }) => event.output.passed,
								projectRoot: ({ event }) => event.output.projectRoot,
							}),
							// Display preflight results before transitioning
							({ context, event }) => {
								if (context.cliContext) {
									displayPreflightResults(
										context.cliContext,
										event.output.checks
									);
								}
							},
						],
						guard: ({ event }) => event.output.passed,
						target: 'modeSelection',
					},
					{
						actions: assign({
							preflightChecks: ({ event }) => event.output.checks,
							preflightPassed: false,
						}),
						target: 'preflightError',
					},
				],
				onError: {
					actions: assign({
						errors: ({ context, event }) => [
							...context.errors,
							{
								error: event.error as Error,
								state: 'preflight',
								timestamp: Date.now(),
							},
						],
					}),
					target: 'error',
				},
				src: 'preflight',
			},
		},

		/**
		 * Preflight checks failed
		 */
		preflightError: {
			after: {
				// Auto-exit after displaying error
				100: 'exited',
			},
			entry: ({ context }) => {
				if (context.cliContext) {
					displayPreflightFailure(context.cliContext, context.preflightChecks);
				}
			},
			on: {
				RETRY: {
					actions: assign({
						errors: [],
						preflightChecks: [],
						preflightPassed: false,
					}),
					target: 'preflight',
				},
			},
		},

		/**
		 * Rollback files
		 */
		rollback: {
			invoke: {
				input: ({ context }) => ({
					filesCreated: context.filesCreated,
					filesModified: context.filesModified,
				}),
				onDone: {
					actions: assign({
						cleanupDone: true,
						filesCreated: [],
						filesModified: [],
					}),
					target: 'exited',
				},
				onError: {
					actions: assign({
						cleanupDone: true,
					}),
					target: 'exited',
				},
				src: 'rollback',
			},
		},

		/**
		 * Route to appropriate mode based on selection
		 */
		routeToMode: {
			always: [
				{ guard: 'isHostedMode', target: 'hostedMode' },
				{ guard: 'isOfflineMode', target: 'offlineMode' },
				{ guard: 'isCustomMode', target: 'customMode' },
				// Default to custom mode if unknown
				{ target: 'customMode' },
			],
		},

		/**
		 * Scripts option prompt
		 */
		scriptsOptions: {
			invoke: {
				input: ({ context }) => ({
					cliContext: getDefined(context.cliContext),
				}),
				onDone: {
					actions: assign({
						addScripts: ({ event }) => event.output.addScripts,
						dependenciesToAdd: ({ context, event }) => {
							// Frontend targets install the c15t umbrella package. The
							// dependency check treats an existing scoped install
							// (@c15t/react, @c15t/nextjs) as already satisfying it.
							const deps: string[] = [UMBRELLA_PACKAGE];
							if (event.output.addScripts) {
								deps.push('@c15t/scripts');
							}
							if (context.enableDevTools && context.framework?.pkg === 'c15t') {
								deps.push('@c15t/dev-tools');
							}
							return deps;
						},
						selectedScripts: ({ event }) => event.output.selectedScripts ?? [],
					}),
					target: 'fileGeneration',
				},
				onError: {
					actions: assign({
						cancelReason: 'Scripts option cancelled',
					}),
					target: 'cancelling',
				},
				src: 'scriptsOption',
			},
		},

		/**
		 * Skills install prompt
		 */
		skillsInstall: {
			invoke: {
				input: ({ context }) => ({
					cliContext: getDefined(context.cliContext),
				}),
				onDone: {
					actions: assign({
						skillsInstalled: ({ event }) => event.output.installed,
					}),
					target: 'githubStar',
				},
				onError: 'githubStar',
				src: 'skillsInstall',
			},
		},

		/**
		 * Display summary
		 */
		summary: {
			after: {
				100: 'skillsInstall',
			},
			entry: ({ context }) => {
				if (!context.cliContext) {
					return;
				}

				const { logger, packageManager } = context.cliContext;

				// Show mode-specific guidance
				if (
					context.selectedMode === 'hosted' &&
					context.hostedProvider === 'self-hosted'
				) {
					logger.info('Setup your backend with the c15t docs:');
					logger.info('https://c15t.com/docs/self-host/quickstart');
				} else if (context.selectedMode === 'custom') {
					logger.info(
						'Configuration Complete! Implement your custom endpoint handlers.'
					);
				}

				// Show install status
				if (context.installConfirmed && !context.installSucceeded) {
					logger.warn(
						'Dependency installation failed. Please check errors and install manually.'
					);
				} else if (
					!context.installConfirmed &&
					context.dependenciesToAdd.length > 0
				) {
					const pmCommand = getManualInstallCommand(
						context.dependenciesToAdd,
						packageManager.name
					);
					logger.warn(`Run ${pmCommand} to install required dependencies.`);
				}
			},
		},
	},
});

export type GenerateMachine = typeof generateMachine;
