/**
 * Pre-flight checks for the generate command
 *
 * Validates the project environment before starting generation.
 */

import path from 'node:path';

import color from 'picocolors';

import type { CliContext } from '~/context/types';

/**
 * Pre-flight check result
 */
export interface PreflightResult {
	passed: boolean;
	checks: PreflightCheck[];
}

/**
 * Individual check result
 */
export interface PreflightCheck {
	name: string;
	status: 'pass' | 'warn' | 'fail';
	message: string;
	hint?: string;
}

/**
 * Check if a file exists
 */
const exists = async function exists(filePath: string): Promise<boolean> {
	try {
		const fs = await import('node:fs/promises');
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
};

/**
 * Get status icon
 */
const getStatusIcon = function getStatusIcon(
	status: PreflightCheck['status']
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
 * Run all pre-flight checks
 */
export const runPreflightChecks = async function runPreflightChecks(
	context: CliContext
): Promise<PreflightResult> {
	const { projectRoot, framework, logger } = context;

	const checks: PreflightCheck[] = [];

	logger.message('');
	logger.message(color.bold('Running pre-flight checks...'));
	logger.message('');

	// Check 1: package.json exists
	const packageJsonPath = path.join(projectRoot, 'package.json');
	const hasPackageJson = await exists(packageJsonPath);
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

	// Display results
	for (const check of checks) {
		const icon = getStatusIcon(check.status);
		logger.message(`${icon} ${check.message}`);
		if (check.hint && check.status !== 'pass') {
			logger.message(`  ${color.dim(check.hint)}`);
		}
	}

	// Determine if we can proceed
	const hasFailures = checks.some((c) => c.status === 'fail');

	logger.message('');

	return {
		checks,
		passed: !hasFailures,
	};
};

/**
 * Display pre-flight failure message
 */
export const displayPreflightFailure = function displayPreflightFailure(
	context: CliContext,
	result: PreflightResult
): void {
	const { logger } = context;

	logger.error('Pre-flight checks failed');
	logger.message('');

	const failures = result.checks.filter((c) => c.status === 'fail');
	for (const check of failures) {
		logger.message(`${color.red('•')} ${check.message}`);
		if (check.hint) {
			logger.message(`  ${check.hint}`);
		}
	}

	logger.message('');
	logger.message('Please fix the issues above and try again.');
};
