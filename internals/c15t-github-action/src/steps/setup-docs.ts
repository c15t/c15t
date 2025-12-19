import { spawnSync } from 'node:child_process';
import * as core from '@actions/core';
import * as github from '@actions/github';

function ensurePnpmAvailable(): void {
	const check = spawnSync('pnpm', ['--version'], { stdio: 'ignore' });
	if (!check.error && check.status === 0) {
		return;
	}

	core.info('pnpm not found; enabling via corepack');
	const enable = spawnSync('corepack', ['enable'], { stdio: 'inherit' });
	if (enable.error) {
		throw enable.error;
	}
	if (typeof enable.status === 'number' && enable.status !== 0) {
		throw new Error(`corepack enable failed with exit code ${enable.status}`);
	}

	const prepare = spawnSync(
		'corepack',
		['prepare', 'pnpm@10.8.0', '--activate'],
		{ stdio: 'inherit' }
	);
	if (prepare.error) {
		throw prepare.error;
	}
	if (typeof prepare.status === 'number' && prepare.status !== 0) {
		throw new Error(`corepack prepare failed with exit code ${prepare.status}`);
	}
}

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
	ensurePnpmAvailable();
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
