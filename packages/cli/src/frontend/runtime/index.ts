import { runFrontendCommand } from '../index.ts';
import type { FrontendCommandContext } from '../index.ts';
import { applyGeneration, planGeneration, recoverGeneration } from './files.ts';
import type { ApplicationPlan } from './files.ts';
import {
	installGenerationDependencies,
	requireNativeInstaller,
} from './install.ts';
import type { PackageManager } from './install.ts';

export { applyGeneration, planGeneration, recoverGeneration } from './files.ts';
export type { ApplicationPlan, PlannedFile } from './files.ts';
export { installGenerationDependencies } from './install.ts';
export type { PackageManager } from './install.ts';

/** Explicit runtime configuration owned by the host CLI. */
export interface GenerationRuntimeOptions {
	cwd: string;
	/** Required to install during apply; --skip-install avoids installation. */
	packageManager?: PackageManager;
	signal?: AbortSignal;
}

/** A reviewed or applied frontend generation result. */
export interface GenerationWorkflowResult {
	command: 'setup' | 'generate';
	applied: boolean;
	created: string[];
	installed: boolean;
	plan: ApplicationPlan;
	recovered: boolean;
}

/** Runtime controls and arguments forwarded to the pure frontend dispatcher. */
export interface GenerationWorkflowArguments {
	apply: boolean;
	forwarded: string[];
	resume: boolean;
	skipInstall: boolean;
}

/**
 * Validate runtime flags before host authentication or filesystem operations.
 * @param args Arguments starting with setup or generate.
 * @returns Runtime controls and pure command arguments.
 * @throws {Error} For repeated or conflicting runtime flags.
 */
export const parseGenerationWorkflowArguments = (
	args: string[]
): GenerationWorkflowArguments => {
	const forwarded: string[] = [];
	const seen: string[] = [];
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index] ?? '';
		if (
			['--apply', '--plan', '--dry-run', '--resume', '--skip-install'].includes(
				argument
			)
		) {
			if (seen.includes(argument)) {
				throw new Error(`Supply ${argument} only once.`);
			}
			seen.push(argument);
		} else {
			forwarded.push(argument);
			if (
				['--mode', '--framework', '--backend-url', '--scripts'].includes(
					argument
				)
			) {
				index += 1;
				forwarded.push(args[index] ?? '');
			}
		}
	}
	const apply = seen.includes('--apply');
	const resume = seen.includes('--resume');
	if (
		(apply && (seen.includes('--plan') || seen.includes('--dry-run'))) ||
		(resume && !apply)
	) {
		throw new Error(
			'Use --apply without --plan or --dry-run. Recovery requires --resume --apply.'
		);
	}
	return {
		apply,
		forwarded,
		resume,
		skipInstall: seen.includes('--skip-install'),
	};
};

/**
 * Plan or apply standalone generation using native filesystem and process APIs.
 * @param args Arguments after the host's c15t namespace, starting with setup or generate.
 * @param context Framework, backend URL, or selected project supplied by the host.
 * @param options Application directory, package manager, and cancellation from the host.
 * @returns The reviewed plan and completed file/installation operations.
 * @throws {Error} For invalid inputs, conflicting files, recovery problems, or installation failure.
 * Installation failure and cancellation after apply list the created files in the message.
 * @example
 * await runGenerationWorkflow(['generate', '--apply'], {
 *   generation: { framework: 'react', backendURL: projectBackendURL },
 * }, { cwd: projectDirectory, packageManager: 'bun' });
 */
export const runGenerationWorkflow = async (
	args: string[],
	context: FrontendCommandContext,
	options: GenerationRuntimeOptions
): Promise<GenerationWorkflowResult> => {
	options.signal?.throwIfAborted();
	const flags = parseGenerationWorkflowArguments(args);
	const result = runFrontendCommand(flags.forwarded, context);
	if (result.command !== 'setup' && result.command !== 'generate') {
		throw new Error('The generation runtime accepts setup and generate only.');
	}
	if (flags.apply && !flags.skipInstall && !options.packageManager) {
		throw new Error(
			'Supply a package manager from the host or use --skip-install.'
		);
	}
	if (flags.apply && !flags.skipInstall && result.data.dependencies.length) {
		requireNativeInstaller();
	}
	const recovered = flags.resume ? recoverGeneration(options.cwd) : false;
	const plan = planGeneration(options.cwd, result.data);
	options.signal?.throwIfAborted();
	const created = flags.apply ? applyGeneration(plan) : [];
	let installed = false;
	if (flags.apply && !flags.skipInstall && options.packageManager) {
		try {
			// Cancellation after apply reports like mid-install cancellation.
			await installGenerationDependencies(
				plan.root,
				plan.dependencies,
				options.packageManager,
				options.signal
			);
		} catch (error) {
			if (!created.length || !(error instanceof Error)) {
				throw error;
			}
			throw new Error(`${error.message} Created: ${created.join(', ')}.`, {
				cause: error,
			});
		}
		installed = true;
	}
	return {
		applied: flags.apply,
		command: result.command,
		created,
		installed,
		plan,
		recovered,
	};
};
