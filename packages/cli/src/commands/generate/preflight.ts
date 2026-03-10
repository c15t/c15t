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
async function exists(filePath: string): Promise<boolean> {
	try {
		const fs = await import('node:fs/promises');
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Run all pre-flight checks
 */
export async function runPreflightChecks(
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
		name: 'package.json',
		status: hasPackageJson ? 'pass' : 'fail',
		message: hasPackageJson ? 'Found package.json' : 'No package.json found',
		hint: hasPackageJson
			? undefined
			: 'Make sure you are in a JavaScript/TypeScript project',
	});

	// Check 2: Framework detected
	checks.push({
		name: 'Framework',
		status: framework.framework ? 'pass' : 'warn',
		message: framework.framework
			? `Detected ${framework.framework}`
			: 'No framework detected',
		hint: framework.framework ? undefined : 'Will use vanilla JavaScript setup',
	});

	// Check 3: React detected (for React/Next.js packages)
	if (framework.pkg !== 'c15t') {
		checks.push({
			name: 'React',
			status: framework.hasReact ? 'pass' : 'warn',
			message: framework.hasReact
				? `Found React ${framework.reactVersion || ''}`
				: 'React not detected',
			hint: framework.hasReact ? undefined : 'c15t works best with React',
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
		passed: !hasFailures,
		checks,
	};
}

/**
 * Get status icon
 */
function getStatusIcon(status: PreflightCheck['status']): string {
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
}

/**
 * Display pre-flight failure message
 */
export function displayPreflightFailure(
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
}
