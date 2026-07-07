/**
 * Reconciles GitHub monitor issues with a live vendor report.
 *
 * Reads the JSON report produced by `runner.ts`, then opens one deduped issue
 * per failing vendor, edits the issue body when a vendor's failure signature
 * changes, and closes issues for vendors that recovered. Sustained identical
 * failures produce no writes, so long incidents do not accumulate noise.
 * Focused runs only touch the vendors they probed.
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

const GITHUB_REQUEST_TIMEOUT_MS = 30_000;

interface GitHubIssue {
	number: number;
	title: string;
	body?: string;
	pull_request?: unknown;
}

/**
 * Reads the `--report` path from CLI arguments.
 *
 * @param argv - Arguments after the script path.
 * @returns The report path, defaulting to `live-vendors-report.json`.
 * @throws `Error` when `--report` is passed without a value.
 */
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

/**
 * Reads a required environment variable.
 *
 * @param name - Environment variable name.
 * @returns The non-empty value.
 * @throws `Error` naming the variable when it is unset or empty.
 */
function requireEnv(name: string): string {
	const value = Bun.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable ${name}`);
	}

	return value;
}

/**
 * Performs an authenticated GitHub REST request.
 *
 * @param token - GitHub token with `issues: write` scope.
 * @param method - HTTP method.
 * @param path - REST path beginning with `/`.
 * @param body - Optional JSON payload.
 * @returns The parsed JSON response.
 * @throws `Error` with the status and response text on non-2xx responses,
 * or an abort error when the request exceeds 30s.
 */
async function githubRequest<T>(
	token: string,
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	const headers: Record<string, string> = {
		accept: 'application/vnd.github+json',
		authorization: `Bearer ${token}`,
		'x-github-api-version': '2022-11-28',
	};
	let serializedBody: string | undefined;
	if (body !== undefined) {
		headers['content-type'] = 'application/json';
		serializedBody = JSON.stringify(body);
	}

	const response = await fetch(`https://api.github.com${path}`, {
		method,
		headers,
		body: serializedBody,
		signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`GitHub API ${method} ${path} failed with ${response.status}: ${text}`
		);
	}

	return (await response.json()) as T;
}

/**
 * Lists open monitor issues (deduped by title prefix), including bodies so
 * failure signatures can be compared.
 *
 * @throws `Error` when a GitHub API page request fails.
 */
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
				issues.push({
					number: issue.number,
					title: issue.title,
					body: issue.body,
				});
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
	const failures: string[] = [];

	for (const action of plan.create) {
		try {
			const issue = await githubRequest<GitHubIssue>(
				token,
				'POST',
				`/repos/${repository}/issues`,
				{ title: action.title, body: action.body }
			);
			console.log(`Opened #${issue.number} for ${action.vendor}`);
		} catch (error) {
			failures.push(`create ${action.vendor}: ${String(error)}`);
		}
	}

	for (const action of plan.update) {
		try {
			await githubRequest(
				token,
				'PATCH',
				`/repos/${repository}/issues/${action.issueNumber}`,
				{ body: action.body }
			);
			console.log(
				`Updated #${action.issueNumber} — ${action.vendor} failure signature changed`
			);
		} catch (error) {
			failures.push(`update ${action.vendor}: ${String(error)}`);
		}
	}

	for (const action of plan.close) {
		try {
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
		} catch (error) {
			failures.push(`close ${action.vendor}: ${String(error)}`);
		}
	}

	console.log(
		`Issue sync complete: ${plan.create.length} opened, ${plan.update.length} updated, ${plan.close.length} closed.`
	);

	if (failures.length > 0) {
		console.error(`Issue sync errors:\n- ${failures.join('\n- ')}`);
		process.exitCode = 1;
	}
}

await main();
