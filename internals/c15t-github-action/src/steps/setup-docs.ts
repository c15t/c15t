import { spawnSync } from 'node:child_process';
import * as core from '@actions/core';
import * as github from '@actions/github';

function isForkPullRequest(): boolean {
	const pr = (
		github.context?.payload as unknown as {
			pull_request?: { head?: { repo?: { full_name?: string } } };
		}
	)?.pull_request;
	if (!pr) {
		return false;
	}
	const headRepo = pr.head?.repo?.full_name || '';
	const thisRepo = `${github.context.repo.owner}/${github.context.repo.repo}`;
	return headRepo.toLowerCase() !== thisRepo.toLowerCase();
}

export function setupDocsWithScript(consentGitToken?: string): void {
	const isPrFromFork = isForkPullRequest();
	if (isPrFromFork) {
		core.info('PR from fork detected: skipping docs setup');
		return;
	}
	const env = {
		...process.env,
		CONSENT_GIT_TOKEN: consentGitToken || process.env.CONSENT_GIT_TOKEN || '',
	};
	core.info('Running docs setup script via pnpm tsx scripts/setup-docs.ts');
	const result = spawnSync(
		'pnpm',
		['tsx', 'scripts/setup-docs.ts', '--vercel'],
		{ stdio: 'inherit', env }
	);
	if (result.error) {
		throw result.error;
	}
	if (typeof result.status === 'number' && result.status !== 0) {
		throw new Error(`setup-docs script failed with exit code ${result.status}`);
	}
}
