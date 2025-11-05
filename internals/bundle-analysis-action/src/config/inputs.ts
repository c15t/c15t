/**
 * @packageDocumentation
 * Configuration and input resolution for the bundle analysis GitHub Action.
 */
import * as core from '@actions/core';
import { context } from '@actions/github';

/**
 * Directory containing base branch rsdoctor data files
 */
export const baseDir =
	core.getInput('base_dir', { required: false }) || '.bundle-base';

/**
 * Directory containing current branch rsdoctor data files
 */
export const currentDir =
	core.getInput('current_dir', { required: false }) || '.';

/**
 * GitHub token for API requests
 */
export const githubToken = core.getInput('github_token', { required: true });

/**
 * Header identifier for sticky comments
 */
export const header =
	core.getInput('header', { required: false }) || 'bundle-analysis';

/**
 * Pull request number (auto-detected if not provided)
 */
const inputPrNumber = core.getInput('pr_number', { required: false });
export const prNumber =
	context?.payload?.pull_request?.number ??
	(inputPrNumber ? Number(inputPrNumber) : undefined);

/**
 * Whether to skip posting a comment
 */
export const skipComment = core.getBooleanInput('skip_comment', {
	required: false,
});

/**
 * Whether to fail the action on significant bundle increases
 */
export const failOnIncrease = core.getBooleanInput('fail_on_increase', {
	required: false,
});

/**
 * Directory containing packages to analyze
 */
export const packagesDir =
	core.getInput('packages_dir', { required: false }) || 'packages';

/**
 * Percentage threshold for significant bundle size increase
 */
const thresholdInput = core.getInput('threshold', { required: false }) || '10';
const parsedThreshold = parseFloat(thresholdInput);
export const threshold =
	isNaN(parsedThreshold) || parsedThreshold < 0 ? 10 : parsedThreshold;

/**
 * Repository descriptor where the action will run
 */
export const repo = {
	owner: context.repo.owner,
	repo: context.repo.repo,
};
