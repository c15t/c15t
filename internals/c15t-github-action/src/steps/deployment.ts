import * as core from '@actions/core';
import * as github from '@actions/github';
import {
	aliasDomains,
	aliasOnBranch,
	canaryAlias,
	changeGlobs,
	checkTemplateChanges,
	consentGitToken,
	deployOnPrBaseBranches,
	deployOnPushBranches,
	onlyIfChanged,
	setupDocs,
	vercelArgs,
	vercelFramework,
	vercelOrgId,
	vercelProjectId,
	vercelScope,
	vercelTarget,
	vercelToken,
	vercelWorkingDirectory,
} from '../config/inputs';
import { type DeployTarget, deployToVercel } from '../deploy/vercel-client';
import { ErrorHandler, executeWithRetry } from '../utils/errors';
import { detectRelevantChanges, shouldDeployByPolicy } from './changes';
import { setupDocsWithScript } from './setup-docs';

async function createGitHubDeployment(
	octokit: ReturnType<typeof github.getOctokit>,
	environmentName: string,
	payload?: Record<string, unknown>
): Promise<number | undefined> {
	try {
		const ghDeployment = await octokit.rest.repos.createDeployment({
			...github.context.repo,
			ref: github.context.sha,
			required_contexts: [],
			environment: environmentName,
			transient_environment: environmentName !== 'production',
			production_environment: environmentName === 'production',
			auto_merge: false,
			auto_inactive: false,
			description: 'Vercel deployment',
			...(payload ? { payload: JSON.stringify(payload) } : {}),
		});
		const id = (ghDeployment as unknown as { data?: { id?: number } }).data?.id;
		return typeof id === 'number' ? id : undefined;
	} catch (e) {
		core.warning(
			`Could not create GitHub Deployment: ${e instanceof Error ? e.message : String(e)}`
		);
		return undefined;
	}
}

async function setGitHubDeploymentStatus(
	octokit: ReturnType<typeof github.getOctokit>,
	deploymentId: number,
	state: 'in_progress' | 'success' | 'failure',
	description: string,
	environmentUrl?: string
): Promise<void> {
	try {
		await octokit.rest.repos.createDeploymentStatus({
			...github.context.repo,
			deployment_id: deploymentId,
			state,
			description,
			...(environmentUrl ? { environment_url: environmentUrl } : {}),
		});
	} catch (e) {
		core.warning(
			`Could not set deployment ${state}: ${e instanceof Error ? e.message : String(e)}`
		);
	}
}

export function resolveBranch(): string {
	const ref = github.context.ref || '';
	const headRef =
		(github.context as unknown as { head_ref?: string }).head_ref || '';
	if (headRef) {
		return headRef;
	}
	if (ref.startsWith('refs/heads/')) {
		return ref.replace('refs/heads/', '');
	}
	return ref;
}

export function computeEnvironmentName(
	target: DeployTarget | undefined,
	branch: string
): string {
	if (target === 'production') {
		return 'production';
	}
	if (branch === 'main') {
		return 'production';
	}
	return `preview/${branch}`;
}

async function ensureGitMetaEnv(
	octokit: ReturnType<typeof github.getOctokit>
): Promise<void> {
	const env = process.env;
	if (
		env.GITHUB_COMMIT_MESSAGE &&
		env.GITHUB_COMMIT_AUTHOR_NAME &&
		env.GITHUB_COMMIT_AUTHOR_LOGIN
	) {
		return;
	}
	try {
		const sha = github.context.sha;
		const { data: commit } = await octokit.rest.repos.getCommit({
			...github.context.repo,
			ref: sha,
		});
		if (!env.GITHUB_COMMIT_MESSAGE) {
			process.env.GITHUB_COMMIT_MESSAGE = commit.commit.message || '';
		}
		if (!env.GITHUB_COMMIT_AUTHOR_NAME) {
			process.env.GITHUB_COMMIT_AUTHOR_NAME = commit.commit.author?.name || '';
		}
		if (!env.GITHUB_COMMIT_AUTHOR_LOGIN) {
			process.env.GITHUB_COMMIT_AUTHOR_LOGIN = github.context.actor || '';
		}
		if (!env.GITHUB_PR_NUMBER) {
			const prNum = (
				github.context.payload as unknown as {
					pull_request?: { number?: number };
				}
			)?.pull_request?.number;
			if (typeof prNum === 'number') {
				process.env.GITHUB_PR_NUMBER = String(prNum);
			}
		}
	} catch (e) {
		core.debug(
			`ensureGitMetaEnv failed: ${e instanceof Error ? e.message : String(e)}`
		);
	}
}

export async function performVercelDeployment(
	octokit: ReturnType<typeof github.getOctokit>
): Promise<string | undefined> {
	if (!vercelToken || !vercelProjectId || !vercelOrgId) {
		return undefined;
	}

	// Optional docs setup inline
	if (setupDocs) {
		try {
			setupDocsWithScript(consentGitToken);
		} catch (e) {
			core.setFailed(
				`docs setup failed: ${e instanceof Error ? e.message : String(e)}`
			);
			return undefined;
		}
	}

	// Policy: only deploy on allowed branches/PR bases
	const allowedByPolicy = shouldDeployByPolicy(
		deployOnPushBranches,
		deployOnPrBaseBranches
	);
	if (!allowedByPolicy) {
		core.info('Policy prevents deploy on this ref; skipping deployment');
		return undefined;
	}

	// Change detection gating
	if (onlyIfChanged) {
		const globs = changeGlobs.length
			? changeGlobs
			: ['docs/**', 'packages/*/src/**', 'packages/*/package.json'];
		const relevant = await detectRelevantChanges(octokit, globs);
		if (!relevant && !checkTemplateChanges) {
			core.info('No relevant file changes detected; skipping deployment');
			return undefined;
		}
	}

	const branch = resolveBranch();
	let targetHint: DeployTarget | undefined =
		vercelTarget && vercelTarget.trim() !== ''
			? (vercelTarget as DeployTarget)
			: undefined;
	if (!targetHint) {
		if (branch === 'main') {
			targetHint = 'production' as DeployTarget;
		} else {
			targetHint = 'staging' as DeployTarget;
		}
	}

	// Template change tracking (best effort) - DISABLED
	let latestTemplateSha: string | undefined;
	// if (checkTemplateChanges) {
	// 	const tplRepo = docsTemplateRepo || 'consentdotio/c15t-docs';
	// 	const tplRef = docsTemplateRef || 'main';
	// 	latestTemplateSha = await fetchLatestTemplateSha(
	// 		octokit,
	// 		tplRepo,
	// 		tplRef,
	// 		consentGitToken || process.env.CONSENT_GIT_TOKEN
	// 	);
	// 	const envName = computeEnvironmentName(targetHint, branch);
	// 	const previous = await readLastTemplateShaFromDeployments(octokit, envName);
	// 	if (latestTemplateSha && previous && latestTemplateSha === previous) {
	// 		core.info('Template unchanged; skipping deployment');
	// 		return undefined;
	// 	}
	// }

	const environmentName = computeEnvironmentName(targetHint, branch);
	const deploymentId = await createGitHubDeployment(
		octokit,
		environmentName,
		latestTemplateSha ? { template_sha: latestTemplateSha } : undefined
	);
	if (typeof deploymentId === 'number') {
		await setGitHubDeploymentStatus(
			octokit,
			deploymentId,
			'in_progress',
			'Starting Vercel deploy'
		);
	}

	// Ensure Git metadata envs if not already present
	await ensureGitMetaEnv(octokit);

	try {
		const result = await executeWithRetry(
			() =>
				deployToVercel({
					token: vercelToken,
					projectId: vercelProjectId,
					orgId: vercelOrgId,
					workingDirectory: vercelWorkingDirectory,
					framework: vercelFramework,
					target: targetHint,
					aliasDomain: canaryAlias || undefined,
					aliasBranch: aliasOnBranch || undefined,
					aliasDomains,
					vercelArgs,
					vercelScope,
				}),
			ErrorHandler.handleVercel,
			3
		);
		const url = result.url;
		core.setOutput('deployment_url', url);
		if (typeof deploymentId === 'number') {
			await setGitHubDeploymentStatus(
				octokit,
				deploymentId,
				'success',
				`Preview ready${environmentName ? `: ${environmentName}` : ''}`,
				url
			);
		}
		return url;
	} catch (e) {
		core.setFailed(
			`vercel deployment failed: ${e instanceof Error ? e.message : String(e)}`
		);
		if (typeof deploymentId === 'number') {
			await setGitHubDeploymentStatus(
				octokit,
				deploymentId,
				'failure',
				'Vercel deployment failed'
			);
		}
		return undefined;
	}
}
