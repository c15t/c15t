import * as core from '@actions/core';

/**
 * Rich, actionable error descriptor used to communicate failures with guidance.
 *
 * @remarks
 * Produced by mapping raw provider errors to user-friendly diagnostics with
 * concrete next steps.
 */
export type ActionableError = {
	type:
		| 'deployment'
		| 'authentication'
		| 'configuration'
		| 'api_limit'
		| 'unknown';
	message: string;
	suggestion: string;
	actionItems: string[];
	helpUrl?: string;
	retryable: boolean;
};

/**
 * Helpers to translate provider-specific errors into actionable guidance.
 */
export const ErrorHandler = {
	/** Map Vercel-related errors to an actionable form. */
	handleVercel(error: unknown): ActionableError {
		const message = error instanceof Error ? error.message : String(error);
		if (message.toLowerCase().includes('project not found')) {
			return {
				type: 'configuration',
				message,
				suggestion:
					'Check VERCEL_PROJECT_ID and VERCEL_ORG_ID secrets match your Vercel project.',
				actionItems: [
					'Verify VERCEL_PROJECT_ID exists in Vercel dashboard.',
					'Confirm VERCEL_ORG_ID is the correct team/org.',
					'Ensure VERCEL_TOKEN has access to the project.',
				],
				helpUrl:
					'https://vercel.com/docs/concepts/projects/overview#project-id',
				retryable: false,
			};
		}
		if (message.toLowerCase().includes('rate limit')) {
			return {
				type: 'api_limit',
				message,
				suggestion: 'Wait before retrying or reduce deployment frequency.',
				actionItems: [
					'Wait 10-15 minutes and retry.',
					'Enable only_if_changed gating to avoid unnecessary deploys.',
				],
				retryable: true,
			};
		}
		if (message.toLowerCase().includes('build failed')) {
			return {
				type: 'deployment',
				message,
				suggestion:
					'Inspect Vercel build logs and validate your build locally.',
				actionItems: [
					'Check Vercel build logs for errors.',
					'Run local build: `pnpm -C .docs run build` or project-specific build.',
					'Ensure required env vars are present in Vercel.',
				],
				retryable: true,
			};
		}
		return {
			type: 'unknown',
			message,
			suggestion: 'Review error details and verify deployment configuration.',
			actionItems: ['Check repository secrets', 'Re-run with debug_mode: true'],
			retryable: true,
		};
	},
	/** Map GitHub API failures to actionable guidance. */
	handleGitHub(error: unknown): ActionableError {
		const any = error as { status?: number; message?: string };
		const message =
			any?.message || (error instanceof Error ? error.message : String(error));
		if (any?.status === 403) {
			return {
				type: 'authentication',
				message,
				suggestion:
					'Ensure token has required permissions (pull-requests: write, deployments: write).',
				actionItems: [
					'Use GITHUB_TOKEN with proper permissions in workflow.',
					'If using GitHub App, verify installation permissions.',
				],
				retryable: true,
			};
		}
		if (any?.status === 404) {
			return {
				type: 'configuration',
				message,
				suggestion:
					'Verify repository/PR/deployment resource exists and is accessible.',
				actionItems: [
					'Check repo owner/name and PR number.',
					'Ensure token/app has access to the repository.',
				],
				retryable: false,
			};
		}
		return {
			type: 'unknown',
			message,
			suggestion: 'Check GitHub API status and token permissions.',
			actionItems: ['Verify https://www.githubstatus.com/'],
			retryable: true,
		};
	},
};

/** Retry configuration for `executeWithRetry`. */
export type RetryOptions = {
	maxRetries?: number;
	backoffBaseMs?: number; // base multiplier for exponential backoff
	maxDelayMs?: number;
	sleep?: (ms: number) => Promise<void>;
};

/**
 * Execute an async operation with exponential backoff and actionable error
 * reporting.
 *
 * @typeParam ResultType - Operation resolution type
 * @param operation - Function that performs the async work
 * @param mapError - Maps raw errors to `ActionableError`
 * @param options - Retry configuration or a number representing max retries
 * @returns The resolved operation result
 * @throws Error When the final attempt fails. Non-retryable errors abort ASAP.
 */
export async function executeWithRetry<ResultType>(
	operation: () => Promise<ResultType>,
	mapError: (error: unknown) => ActionableError,
	options: number | RetryOptions = 3
): Promise<ResultType> {
	const opts: RetryOptions =
		typeof options === 'number' ? { maxRetries: options } : options || {};
	const maxRetries = opts.maxRetries ?? 3;
	const base = opts.backoffBaseMs ?? 1000;
	const maxDelay = opts.maxDelayMs ?? 30000;
	const sleeper =
		opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
	let last: ActionableError | undefined;
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (e) {
			last = mapError(e);
			const isLast = attempt === maxRetries;
			if (!last.retryable || isLast) {
				core.error(
					`Failure after ${attempt}/${maxRetries} attempts: ${last.message}`
				);
				core.error(`Suggestion: ${last.suggestion}`);
				for (const item of last.actionItems) {
					core.error(`- ${item}`);
				}
				throw e;
			}
			const delayMs = Math.min(maxDelay, 2 ** attempt * base);
			core.info(`Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})`);
			await sleeper(delayMs);
		}
	}
	throw last ? new Error(last.message) : new Error('Unknown error');
}
