/**
 * @packageDocumentation
 * Entry point for the bundle analysis GitHub Action.
 */
import { readFileSync } from 'node:fs';
import * as core from '@actions/core';
import * as github from '@actions/github';
import {
	analyzeBundles,
	calculateTotalDiffPercent,
	writeReport,
} from './analyze/bundle-analysis';
import {
	baseDir,
	currentDir,
	failOnIncrease,
	githubToken,
	header,
	packagesDir,
	prNumber,
	repo,
	skipComment,
	threshold,
} from './config/inputs';
import { ensureComment } from './github/pr-comment';

async function run(): Promise<void> {
	try {
		core.info('Starting bundle analysis...');

		// Analyze bundles
		const packages = await analyzeBundles(baseDir, currentDir, packagesDir);
		core.info(`Analyzed ${packages.length} packages`);

		// Calculate total diff
		const totalDiffPercent = calculateTotalDiffPercent(packages);

		// Generate report
		const reportPath = 'bundle-diff.md';
		writeReport(packages, reportPath);

		// Set outputs
		core.setOutput('report_path', reportPath);
		core.setOutput('has_changes', packages.length > 0);
		core.setOutput('total_diff_percent', totalDiffPercent.toFixed(2));

		// Post comment if enabled and PR is available
		if (!skipComment && prNumber) {
			const report = readFileSync(reportPath, 'utf-8');

			core.info(`Posting comment on PR #${prNumber}`);
			const octokit = github.getOctokit(githubToken);
			await ensureComment(octokit, repo, prNumber, report, header);
			core.info('Comment posted successfully');
		} else if (skipComment) {
			core.info('Skipping comment posting (skip_comment=true)');
		} else if (!prNumber) {
			core.info('No PR number available, skipping comment');
		}

		// Fail if significant increase detected
		if (failOnIncrease) {
			core.info(`Using threshold: ${threshold}%`);
			const hasSignificantIncrease = packages.some(
				(p) => p.totalDiffPercent > threshold
			);
			if (hasSignificantIncrease) {
				core.setFailed(
					`Bundle size increased significantly (>${threshold}%). Review the changes above.`
				);
			}
		}

		core.info('Bundle analysis complete');
	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(error.message);
		} else {
			core.setFailed('Unknown error occurred');
		}
	}
}

run();
