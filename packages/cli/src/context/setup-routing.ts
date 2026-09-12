import type { CliContext } from './types';

const explicitSetupFlags = [
	'mode',
	'backend-url',
	'project',
	'env',
	'proxy',
	'ssr',
	'devtools',
	'ui-style',
	'theme',
	'scripts',
	'skip-install',
	'plan',
	'dry-run',
	'apply',
];

/** Whether setup selects standalone boilerplate generation. */
export const isBoilerplateSetup = (flags: CliContext['flags']): boolean =>
	['boilerplate', 'framework', 'output', 'package-source'].some((flag) =>
		Boolean(flags[flag])
	);

/** Whether setup consumes explicit inputs without interactive configuration. */
export const usesExplicitSetup = (
	flags: CliContext['flags'],
	mode?: string
): boolean =>
	Boolean(
		flags['non-interactive'] ||
		explicitSetupFlags.some((flag) => Object.hasOwn(flags, flag)) ||
		(flags.yes && mode)
	);

/** Whether the selected command should skip setup's package-manager prompt. */
export const runsSetupWithoutPrompts = (
	commandName: string | undefined,
	flags: CliContext['flags'],
	mode?: string
): boolean =>
	['setup', 'generate'].includes(commandName ?? '') &&
	(isBoilerplateSetup(flags) || usesExplicitSetup(flags, mode));
