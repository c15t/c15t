/**
 * Generate command state machine
 *
 * Main state machine for the generate flow with all states, transitions, and actors.
 */

import { assign, fromPromise, setup } from 'xstate';
import type { StorageMode } from '~/constants';
import type { CliContext } from '~/context/types';
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
	accountCreationActor,
	backendOptionsActor,
	backendURLActor,
	frontendOptionsActor,
	githubStarActor,
	installConfirmActor,
	modeSelectionActor,
	PromptCancelledError,
	scriptsOptionActor,
	skillsInstallActor,
} from './actors/prompts';
import { guards } from './guards';
import {
	createInitialContext,
	type GenerateMachineContext,
	type GenerateMachineEvent,
} from './types';

/**
 * The generate state machine definition
 */
export const generateMachine = setup({
	types: {
		context: {} as GenerateMachineContext,
		events: {} as GenerateMachineEvent,
		input: {} as { cliContext: CliContext; modeArg?: StorageMode },
	},
	guards,
	actors: {
		preflight: preflightActor,
		modeSelection: modeSelectionActor,
		accountCreation: accountCreationActor,
		backendURL: backendURLActor,
		backendOptions: backendOptionsActor,
		frontendOptions: frontendOptionsActor,
		scriptsOption: scriptsOptionActor,
		fileGeneration: fileGenerationActor,
		checkDependencies: checkDependenciesActor,
		installConfirm: installConfirmActor,
		dependencyInstall: dependencyInstallActor,
		rollback: rollbackActor,
		skillsInstall: skillsInstallActor,
		githubStar: githubStarActor,
	},
}).createMachine({
	id: 'generate',
	initial: 'idle',
	context: ({ input }) => createInitialContext(input.cliContext, input.modeArg),

	// Global cancel handler - can be triggered from any state
	on: {
		CANCEL: {
			target: '.cancelling',
			actions: assign({
				cancelReason: ({ event }) => event.reason ?? 'User cancelled',
			}),
		},
	},

	states: {
		/**
		 * Initial idle state - waiting to start
		 */
		idle: {
			on: {
				START: 'preflight',
			},
		},

		/**
		 * Run preflight checks
		 */
		preflight: {
			invoke: {
				src: 'preflight',
				input: ({ context }) => ({ cliContext: context.cliContext! }),
				onDone: [
					{
						guard: ({ event }) => event.output.passed,
						target: 'modeSelection',
						actions: [
							assign({
								preflightPassed: ({ event }) => event.output.passed,
								preflightChecks: ({ event }) => event.output.checks,
								projectRoot: ({ event }) => event.output.projectRoot,
								framework: ({ event }) => event.output.framework,
								packageManager: ({ event }) => event.output.packageManager,
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
					},
					{
						target: 'preflightError',
						actions: assign({
							preflightPassed: false,
							preflightChecks: ({ event }) => event.output.checks,
						}),
					},
				],
				onError: {
					target: 'error',
					actions: assign({
						errors: ({ context, event }) => [
							...context.errors,
							{
								state: 'preflight',
								error: event.error as Error,
								timestamp: Date.now(),
							},
						],
					}),
				},
			},
		},

		/**
		 * Preflight checks failed
		 */
		preflightError: {
			entry: ({ context }) => {
				if (context.cliContext) {
					displayPreflightFailure(context.cliContext, context.preflightChecks);
				}
			},
			on: {
				RETRY: {
					target: 'preflight',
					actions: assign({
						preflightPassed: false,
						preflightChecks: [],
						errors: [],
					}),
				},
			},
			after: {
				// Auto-exit after displaying error
				100: 'exited',
			},
		},

		/**
		 * Mode selection - prompt user or use CLI arg
		 */
		modeSelection: {
			always: [
				// Skip prompt if mode was provided as argument
				{
					guard: 'hasModeArg',
					target: 'routeToMode',
					actions: assign({
						selectedMode: ({ context }) => context.modeArg,
					}),
				},
			],
			invoke: {
				src: 'modeSelection',
				input: () => ({}),
				onDone: {
					target: 'routeToMode',
					actions: assign({
						selectedMode: ({ event }) => event.output.mode,
					}),
				},
				onError: {
					target: 'cancelling',
					actions: assign({
						cancelReason: 'Mode selection cancelled',
					}),
				},
			},
		},

		/**
		 * Route to appropriate mode based on selection
		 */
		routeToMode: {
			always: [
				{ guard: 'isHostedMode', target: 'hostedMode' },
				{ guard: 'isOfflineMode', target: 'offlineMode' },
				{ guard: 'isSelfHostedMode', target: 'selfHostedMode' },
				{ guard: 'isCustomMode', target: 'customMode' },
				// Default to custom mode if unknown
				{ target: 'customMode' },
			],
		},

		/**
		 * c15t (hosted) mode setup
		 */
		hostedMode: {
			initial: 'accountCreation',
			states: {
				accountCreation: {
					invoke: {
						src: 'accountCreation',
						input: ({ context }) => ({ cliContext: context.cliContext! }),
						onDone: 'backendURL',
						onError: {
							target: '#generate.cancelling',
							actions: assign({
								cancelReason: 'Account creation cancelled',
							}),
						},
					},
				},
				backendURL: {
					invoke: {
						src: 'backendURL',
						input: () => ({ isHostedMode: true }),
						onDone: {
							target: '#generate.backendOptions',
							actions: assign({
								backendURL: ({ event }) => event.output.url,
							}),
						},
						onError: {
							target: '#generate.cancelling',
							actions: assign({
								cancelReason: 'Backend URL entry cancelled',
							}),
						},
					},
				},
			},
		},

		/**
		 * Offline mode setup (no backend needed)
		 */
		offlineMode: {
			always: 'frontendOptions',
		},

		/**
		 * Self-hosted mode setup
		 */
		selfHostedMode: {
			invoke: {
				src: 'backendURL',
				input: () => ({ isHostedMode: false }),
				onDone: {
					target: 'backendOptions',
					actions: assign({
						backendURL: ({ event }) => event.output.url,
					}),
				},
				onError: {
					target: 'cancelling',
					actions: assign({
						cancelReason: 'Backend URL entry cancelled',
					}),
				},
			},
		},

		/**
		 * Custom mode setup (no backend needed)
		 */
		customMode: {
			always: 'frontendOptions',
		},

		/**
		 * Backend options (env file, proxy)
		 */
		backendOptions: {
			invoke: {
				src: 'backendOptions',
				input: ({ context }) => ({
					cliContext: context.cliContext!,
					backendURL: context.backendURL!,
				}),
				onDone: {
					target: 'frontendOptions',
					actions: assign({
						useEnvFile: ({ event }) => event.output.useEnvFile,
						proxyNextjs: ({ event }) => event.output.proxyNextjs,
					}),
				},
				onError: {
					target: 'cancelling',
					actions: assign({
						cancelReason: 'Backend options cancelled',
					}),
				},
			},
		},

		/**
		 * Frontend UI options (SSR, style, theme)
		 */
		frontendOptions: {
			invoke: {
				src: 'frontendOptions',
				input: ({ context }) => ({
					cliContext: context.cliContext!,
					hasBackend:
						context.selectedMode === 'hosted' ||
						context.selectedMode === 'c15t' ||
						context.selectedMode === 'self-hosted',
				}),
				onDone: {
					target: 'scriptsOptions',
					actions: assign({
						enableSSR: ({ event, context }) =>
							event.output.enableSSR ?? context.enableSSR,
						enableDevTools: ({ event, context }) =>
							event.output.enableDevTools ?? context.enableDevTools,
						uiStyle: ({ event }) => event.output.uiStyle,
						expandedTheme: ({ event }) => event.output.expandedTheme ?? null,
					}),
				},
				onError: {
					target: 'cancelling',
					actions: assign({
						cancelReason: 'Frontend options cancelled',
					}),
				},
			},
		},

		/**
		 * Scripts option prompt
		 */
		scriptsOptions: {
			invoke: {
				src: 'scriptsOption',
				input: ({ context }) => ({ cliContext: context.cliContext! }),
				onDone: {
					target: 'fileGeneration',
					actions: assign({
						addScripts: ({ event }) => event.output.addScripts,
						selectedScripts: ({ event }) => event.output.selectedScripts ?? [],
						dependenciesToAdd: ({ context, event }) => {
							const deps: string[] = [context.framework?.pkg ?? 'c15t'];
							if (event.output.addScripts) {
								deps.push('@c15t/scripts');
							}
							if (context.enableDevTools) {
								deps.push('@c15t/dev-tools');
							}
							return deps;
						},
					}),
				},
				onError: {
					target: 'cancelling',
					actions: assign({
						cancelReason: 'Scripts option cancelled',
					}),
				},
			},
		},

		/**
		 * File generation
		 */
		fileGeneration: {
			invoke: {
				src: 'fileGeneration',
				input: ({ context }) => ({
					cliContext: context.cliContext!,
					mode: context.selectedMode!,
					backendURL: context.backendURL,
					useEnvFile: context.useEnvFile,
					proxyNextjs: context.proxyNextjs,
					enableSSR: context.enableSSR,
					enableDevTools: context.enableDevTools,
					uiStyle: context.uiStyle,
					expandedTheme: context.expandedTheme,
					selectedScripts: context.selectedScripts,
				}),
				onDone: {
					target: 'dependencyCheck',
					actions: assign({
						filesCreated: ({ event }) => event.output.filesCreated,
						filesModified: ({ event }) => event.output.filesModified,
					}),
				},
				onError: {
					target: 'error',
					actions: assign({
						errors: ({ context, event }) => [
							...context.errors,
							{
								state: 'fileGeneration',
								error: event.error as Error,
								timestamp: Date.now(),
							},
						],
					}),
				},
			},
		},

		/**
		 * Check which dependencies are already installed
		 */
		dependencyCheck: {
			invoke: {
				src: 'checkDependencies',
				input: ({ context }) => ({
					projectRoot: context.cliContext!.projectRoot,
					dependencies: context.dependenciesToAdd,
				}),
				onDone: {
					target: 'dependencyConfirm',
					actions: assign({
						dependenciesToAdd: ({ event }) => event.output.missing,
					}),
				},
				onError: {
					target: 'dependencyConfirm',
				},
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
				src: 'installConfirm',
				input: ({ context }) => ({
					dependencies: context.dependenciesToAdd,
					packageManager: context.packageManager?.name ?? 'npm',
				}),
				onDone: [
					{
						guard: ({ event }) => event.output.confirmed,
						target: 'dependencyInstall',
						actions: assign({
							installConfirmed: true,
						}),
					},
					{
						target: 'summary',
						actions: assign({
							installConfirmed: false,
						}),
					},
				],
				onError: {
					// Don't cancel on install confirm error, just skip
					target: 'summary',
					actions: assign({
						installConfirmed: false,
					}),
				},
			},
		},

		/**
		 * Install dependencies
		 */
		dependencyInstall: {
			invoke: {
				src: 'dependencyInstall',
				input: ({ context }) => ({
					cliContext: context.cliContext!,
					dependencies: context.dependenciesToAdd,
				}),
				onDone: {
					target: 'summary',
					actions: assign({
						installAttempted: true,
						installSucceeded: ({ event }) => event.output.success,
					}),
				},
				onError: {
					target: 'summary',
					actions: assign({
						installAttempted: true,
						installSucceeded: false,
					}),
				},
			},
		},

		/**
		 * Display summary
		 */
		summary: {
			entry: ({ context }) => {
				if (!context.cliContext) return;

				const { logger, packageManager } = context.cliContext;

				// Show mode-specific guidance
				if (context.selectedMode === 'self-hosted') {
					logger.info('Setup your backend with the c15t docs:');
					logger.info('https://c15t.com/docs/self-host/v2');
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
			after: {
				100: 'skillsInstall',
			},
		},

		/**
		 * Skills install prompt
		 */
		skillsInstall: {
			invoke: {
				src: 'skillsInstall',
				input: ({ context }) => ({ cliContext: context.cliContext! }),
				onDone: {
					target: 'githubStar',
					actions: assign({
						skillsInstalled: ({ event }) => event.output.installed,
					}),
				},
				onError: 'githubStar',
			},
		},

		/**
		 * GitHub star prompt
		 */
		githubStar: {
			invoke: {
				src: 'githubStar',
				input: ({ context }) => ({ cliContext: context.cliContext! }),
				onDone: 'complete',
				onError: 'complete',
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
		 * Error state
		 */
		error: {
			entry: ({ context }) => {
				const lastError = context.errors[context.errors.length - 1];
				context.cliContext?.logger.error(
					`Error: ${lastError?.error?.message ?? 'Unknown error'}`
				);
			},
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
		},

		/**
		 * Cancellation handling
		 */
		cancelling: {
			entry: ({ context }) => {
				context.cliContext?.logger.info(
					context.cancelReason ?? 'Configuration cancelled.'
				);
			},
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
		},

		/**
		 * Rollback files
		 */
		rollback: {
			invoke: {
				src: 'rollback',
				input: ({ context }) => ({
					filesCreated: context.filesCreated,
					filesModified: context.filesModified,
				}),
				onDone: {
					target: 'exited',
					actions: assign({
						filesCreated: [],
						filesModified: [],
						cleanupDone: true,
					}),
				},
				onError: {
					target: 'exited',
					actions: assign({
						cleanupDone: true,
					}),
				},
			},
		},

		/**
		 * Final exited state (after cancel/error)
		 */
		exited: {
			type: 'final',
		},
	},
});

export type GenerateMachine = typeof generateMachine;
