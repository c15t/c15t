/**
 * Preflight check actor for the generate state machine
 *
 * Runs environment validation checks before starting the generate flow.
 */

import path from 'node:path';

import color from 'picocolors';
import { fromPromise } from 'xstate';

import type { CliContext } from '~/context/types';

import type { GenerateMachineContext, PreflightCheckResult } from '../types';

/**
 * Input for the preflight actor
 */
export interface PreflightInput {
	cliContext: CliContext;
}

/**
 * Output from the preflight actor
 */
export interface PreflightOutput {
	passed: boolean;
	checks: PreflightCheckResult[];
	projectRoot: string;
	framework: GenerateMachineContext['framework'];
	packageManager: GenerateMachineContext['packageManager'];
}

/**
 * Check if a file exists
 */
const fileExists = async function fileExists(
	filePath: string
): Promise<boolean> {
	try {
		const fs = await import('node:fs/promises');
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
};

/**
 * Run all preflight checks
 */
const runPreflightChecks = async function runPreflightChecks(
	context: CliContext
): Promise<PreflightOutput> {
	const { projectRoot, framework, packageManager, logger } = context;
	const checks: PreflightCheckResult[] = [];

	logger.debug('Running preflight checks...');

	// Check 1: package.json exists
	const packageJsonPath = path.join(projectRoot, 'package.json');
	const hasPackageJson = await fileExists(packageJsonPath);
	checks.push({
		hint: hasPackageJson
			? undefined
			: 'Make sure you are in a JavaScript/TypeScript project',
		message: hasPackageJson ? 'Found package.json' : 'No package.json found',
		name: 'package.json',
		status: hasPackageJson ? 'pass' : 'fail',
	});

	// Check 2: Framework detected
	checks.push({
		hint: framework.framework ? undefined : 'Will use vanilla JavaScript setup',
		message: framework.framework
			? `Detected ${framework.framework}`
			: 'No framework detected',
		name: 'Framework',
		status: framework.framework ? 'pass' : 'warn',
	});

	// Check 3: React detected (for React/Next.js packages)
	if (framework.pkg !== 'c15t') {
		checks.push({
			hint: framework.hasReact ? undefined : 'c15t works best with React',
			message: framework.hasReact
				? `Found React ${framework.reactVersion || ''}`
				: 'React not detected',
			name: 'React',
			status: framework.hasReact ? 'pass' : 'warn',
		});
	}

	// Check 4: Package manager
	checks.push({
		hint: packageManager.name ? undefined : 'Will default to npm',
		message: packageManager.name
			? `Using ${packageManager.name}`
			: 'No package manager detected',
		name: 'Package Manager',
		status: packageManager.name ? 'pass' : 'warn',
	});

	// Determine if we can proceed
	const hasFailures = checks.some((c) => c.status === 'fail');

	return {
		checks,
		framework: {
			hasReact: framework.hasReact,
			name: framework.framework,
			pkg: framework.pkg,
			reactVersion: framework.reactVersion,
			tailwindVersion: framework.tailwindVersion,
			version: framework.frameworkVersion,
		},
		packageManager,
		passed: !hasFailures,
		projectRoot,
	};
};

/**
 * Preflight actor definition
 *
 * Usage in machine:
 * ```ts
 * invoke: {
 *   src: preflightActor,
 *   input: ({ context }) => ({ cliContext: context.cliContext }),
 *   onDone: { target: 'modeSelection', actions: 'setPreflightResults' },
 *   onError: { target: 'preflightError' },
 * }
 * ```
 */
export const preflightActor = fromPromise<PreflightOutput, PreflightInput>(
	({ input }) => {
		const { cliContext } = input;

		if (!cliContext) {
			throw new Error('CLI context is required for preflight checks');
		}

		return runPreflightChecks(cliContext);
	}
);

/**
 * Get status icon for a preflight check
 */
const getStatusIcon = function getStatusIcon(
	status: PreflightCheckResult['status']
): string {
	switch (status) {
		case 'pass':
			return color.green('✓');
		case 'warn':
			return color.yellow('⚠');
		case 'fail':
			return color.red('✗');
		default:
			return ' ';
	}
};

/**
 * Display preflight results to the user (synchronous)
 */
export const displayPreflightResults = function displayPreflightResults(
	context: CliContext,
	checks: PreflightCheckResult[]
): void {
	const { logger } = context;

	// Build output as single block to avoid extra spacing
	const lines: string[] = [];
	lines.push('');
	lines.push(color.bold('Pre-flight checks:'));

	for (const check of checks) {
		const icon = getStatusIcon(check.status);
		lines.push(`  ${icon} ${check.message}`);
		if (check.hint && check.status !== 'pass') {
			lines.push(`    ${color.dim(check.hint)}`);
		}
	}

	lines.push('');
	logger.message(lines.join('\n'));
};

/**
 * Display preflight failure message (synchronous)
 */
export const displayPreflightFailure = function displayPreflightFailure(
	context: CliContext,
	checks: PreflightCheckResult[]
): void {
	const { logger } = context;

	const lines: string[] = [];
	lines.push(color.red('Pre-flight checks failed'));
	lines.push('');

	const failures = checks.filter((c) => c.status === 'fail');
	for (const check of failures) {
		lines.push(`  ${color.red('•')} ${check.message}`);
		if (check.hint) {
			lines.push(`    ${check.hint}`);
		}
	}

	lines.push('');
	lines.push('Please fix the issues above and try again.');
	logger.message(lines.join('\n'));
};
