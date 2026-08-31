/**
 * @packageDocumentation
 * Entry point for the bundle analysis GitHub Action.
 */
import { readFileSync } from 'node:fs';

import * as core from '@actions/core';
import * as github from '@actions/github';

import {
	analyzeBundles,
	analyzeTransitiveImpact,
	calculateTotalDiffPercent,
	writeReport,
} from './analyze/bundle-analysis';
import { ensureComment } from './github/pr-comment';

interface MainDependencies {
	actionCore: Pick<typeof core, 'info' | 'setFailed' | 'setOutput'>;
	analyzeBundles: typeof analyzeBundles;
	analyzeTransitiveImpact: typeof analyzeTransitiveImpact;
	calculateTotalDiffPercent: typeof calculateTotalDiffPercent;
	ensureComment: typeof ensureComment;
	getOctokit: typeof github.getOctokit;
	inputs: {
		baseDir: string;
		currentDir: string;
		failOnIncrease: boolean;
		githubToken: string;
		header: string;
		packagesDir: string;
		prNumber: number | undefined;
		repo: { owner: string; repo: string };
		skipComment: boolean;
		threshold: number;
		transitiveRoots: string[];
	};
	readFileSync: typeof readFileSync;
	writeReport: typeof writeReport;
}

const loadDefaultMainDependencies =
	async function loadDefaultMainDependencies(): Promise<MainDependencies> {
		const inputs = await import('./config/inputs');

		return {
			actionCore: core,
			analyzeBundles,
			analyzeTransitiveImpact,
			calculateTotalDiffPercent,
			ensureComment,
			getOctokit: github.getOctokit,
			inputs: {
				baseDir: inputs.baseDir,
				currentDir: inputs.currentDir,
				failOnIncrease: inputs.failOnIncrease,
				githubToken: inputs.githubToken,
				header: inputs.header,
				packagesDir: inputs.packagesDir,
				prNumber: inputs.prNumber,
				repo: inputs.repo,
				skipComment: inputs.skipComment,
				threshold: inputs.threshold,
				transitiveRoots: inputs.transitiveRoots,
			},
			readFileSync,
			writeReport,
		};
	};

export const run = async function run(
	dependencies?: MainDependencies
): Promise<void> {
	const resolvedDependencies =
		dependencies ?? (await loadDefaultMainDependencies());
	const {
		actionCore,
		inputs,
		readFileSync: readReportFile,
		writeReport: writeBundleReport,
	} = resolvedDependencies;
	try {
		actionCore.info('Starting bundle analysis...');

		// Analyze bundles
		const packages = await resolvedDependencies.analyzeBundles(
			inputs.baseDir,
			inputs.currentDir,
			inputs.packagesDir
		);
		actionCore.info(`Analyzed ${packages.length} packages`);

		// Analyze transitive impact for selected root packages
		const transitive = resolvedDependencies.analyzeTransitiveImpact(
			packages,
			inputs.currentDir,
			inputs.packagesDir,
			inputs.transitiveRoots,
			inputs.baseDir
		);
		actionCore.info(
			`Computed transitive impact for ${transitive.length} roots`
		);

		// Calculate total diff
		const totalDiffPercent =
			resolvedDependencies.calculateTotalDiffPercent(packages);

		// Generate report
		const reportPath = 'bundle-diff.md';
		writeBundleReport(packages, reportPath, transitive);

		// Set outputs
		actionCore.setOutput('report_path', reportPath);
		actionCore.setOutput('has_changes', packages.length > 0);
		actionCore.setOutput('total_diff_percent', totalDiffPercent.toFixed(2));

		// Post comment if enabled and PR is available
		if (!inputs.skipComment && inputs.prNumber) {
			const report = readReportFile(reportPath, 'utf-8');

			actionCore.info(`Posting comment on PR #${inputs.prNumber}`);
			const octokit = resolvedDependencies.getOctokit(inputs.githubToken);
			await resolvedDependencies.ensureComment(
				octokit,
				inputs.repo,
				inputs.prNumber,
				report,
				inputs.header
			);
			actionCore.info('Comment posted successfully');
		} else if (inputs.skipComment) {
			actionCore.info('Skipping comment posting (skip_comment=true)');
		} else if (!inputs.prNumber) {
			actionCore.info('No PR number available, skipping comment');
		}

		// Fail if significant increase detected
		if (inputs.failOnIncrease) {
			actionCore.info(`Using threshold: ${inputs.threshold}%`);
			const hasSignificantPackageIncrease = packages.some(
				(p) => p.totalDiffPercent > inputs.threshold
			);
			const hasSignificantTransitiveIncrease = transitive.some(
				(entry) => entry.totalDiffPercent > inputs.threshold
			);
			if (hasSignificantPackageIncrease || hasSignificantTransitiveIncrease) {
				actionCore.setFailed(
					`Bundle size increased significantly (>${inputs.threshold}%). Review the changes above.`
				);
			}
		}

		actionCore.info('Bundle analysis complete');
	} catch (error) {
		if (error instanceof Error) {
			actionCore.setFailed(error.message);
		} else {
			actionCore.setFailed('Unknown error occurred');
		}
	}
};

if (process.env.NODE_ENV !== 'test') {
	void run();
}
