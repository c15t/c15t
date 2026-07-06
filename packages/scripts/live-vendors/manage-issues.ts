/**
 * Reconciles GitHub monitor issues with a live vendor report.
 *
 * Reads the JSON report produced by `runner.ts`, then opens one deduped issue
 * per failing vendor, comments on still-failing vendors, and closes issues
 * for vendors that recovered. Focused runs only touch the vendors they probed.
 *
 * Usage (GitHub Actions):
 *   GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo \
 *     bun live-vendors/manage-issues.ts --report live-vendors-report.json
 */
import {
	type ExistingMonitorIssue,
	MONITOR_ISSUE_TITLE_PREFIX,
	planMonitorIssueActions,
} from './report';
import type { LiveVendorReport } from './types';

interface GitHubIssue {
	number: number;
	title: string;
	pull_request?: unknown;
}

function parseReportPath(argv: string[]): string {
	const index = argv.indexOf('--report');

	if (index !== -1) {
		const value = argv[index + 1];
		if (!value) {
			throw new Error('--report requires a file path');
		}
		return value;
	}

	return 'live-vendors-report.json';
}

function requireEnv(name: string): string {
	const value = Bun.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable ${name}`);
	}

	return value;
}

async function githubRequest<T>(
	token: string,
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	const response = await fetch(`https://api.github.com${path}`, {
		method,
		headers: {
			accept: 'application/vnd.github+json',
			authorization: `Bearer ${token}`,
			'x-github-api-version': '2022-11-28',
			...(body !== undefined ? { 'content-type': 'application/json' } : {}),
		},
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`GitHub API ${method} ${path} failed with ${response.status}: ${text}`
		);
	}

	return (await response.json()) as T;
}

async function listOpenMonitorIssues(
	token: string,
	repository: string
): Promise<ExistingMonitorIssue[]> {
	const issues: ExistingMonitorIssue[] = [];

	for (let page = 1; page <= 10; page++) {
		const batch = await githubRequest<GitHubIssue[]>(
			token,
			'GET',
			`/repos/${repository}/issues?state=open&per_page=100&page=${page}`
		);

		for (const issue of batch) {
			// The issues endpoint also returns pull requests; skip those.
			if (issue.pull_request) {
				continue;
			}

			if (issue.title.startsWith(MONITOR_ISSUE_TITLE_PREFIX)) {
				issues.push({ number: issue.number, title: issue.title });
			}
		}

		if (batch.length < 100) {
			break;
		}
	}

	return issues;
}

async function main(): Promise<void> {
	const reportPath = parseReportPath(Bun.argv.slice(2));
	const token = requireEnv('GITHUB_TOKEN');
	const repository = requireEnv('GITHUB_REPOSITORY');

	const report = (await Bun.file(reportPath).json()) as LiveVendorReport;
	const existingIssues = await listOpenMonitorIssues(token, repository);
	const plan = planMonitorIssueActions(report, existingIssues);

	for (const action of plan.create) {
		const issue = await githubRequest<GitHubIssue>(
			token,
			'POST',
			`/repos/${repository}/issues`,
			{ title: action.title, body: action.body }
		);
		console.log(`Opened #${issue.number} for ${action.vendor}`);
	}

	for (const action of plan.comment) {
		await githubRequest(
			token,
			'POST',
			`/repos/${repository}/issues/${action.issueNumber}/comments`,
			{ body: action.body }
		);
		console.log(
			`Commented on #${action.issueNumber} for still-failing ${action.vendor}`
		);
	}

	for (const action of plan.close) {
		await githubRequest(
			token,
			'POST',
			`/repos/${repository}/issues/${action.issueNumber}/comments`,
			{ body: action.body }
		);
		await githubRequest(
			token,
			'PATCH',
			`/repos/${repository}/issues/${action.issueNumber}`,
			{ state: 'closed', state_reason: 'completed' }
		);
		console.log(`Closed #${action.issueNumber} — ${action.vendor} recovered`);
	}

	console.log(
		`Issue sync complete: ${plan.create.length} opened, ${plan.comment.length} updated, ${plan.close.length} closed.`
	);
}

await main();
