import * as core from '@actions/core';
import * as github from '@actions/github';
import {
	aliasDomains,
	aliasOnBranch,
	canaryAlias,
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

export async function createGithubDeployment(
	octokit: ReturnType<typeof github.getOctokit>,
	environmentName: string
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

export async function setGithubDeploymentStatus(
	octokit: ReturnType<typeof github.getOctokit>,
	deploymentId: number,
	state: 'in_progress' | 'success',
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

export async function performVercelDeployment(
	octokit: ReturnType<typeof github.getOctokit>
): Promise<string | undefined> {
	if (!vercelToken || !vercelProjectId || !vercelOrgId) {
		return undefined;
	}

	const branch = resolveBranch();
	const targetHint =
		(vercelTarget as DeployTarget) ||
		(branch === 'main'
			? ('production' as DeployTarget)
			: ('staging' as DeployTarget));
	const environmentName = computeEnvironmentName(targetHint, branch);
	const deploymentId = await createGithubDeployment(octokit, environmentName);
	if (typeof deploymentId === 'number') {
		await setGithubDeploymentStatus(
			octokit,
			deploymentId,
			'in_progress',
			'Starting Vercel deploy'
		);
	}

	const result = await deployToVercel({
		token: vercelToken,
		projectId: vercelProjectId,
		orgId: vercelOrgId,
		workingDirectory: vercelWorkingDirectory,
		framework: vercelFramework,
		target: (vercelTarget as DeployTarget) || undefined,
		aliasDomain: canaryAlias || undefined,
		aliasBranch: aliasOnBranch || undefined,
		aliasDomains,
		vercelArgs,
		vercelScope,
	});

	const url = result.url;
	core.setOutput('deployment_url', url);
	if (typeof deploymentId === 'number') {
		await setGithubDeploymentStatus(
			octokit,
			deploymentId,
			'success',
			`Preview ready${environmentName ? `: ${environmentName}` : ''}`,
			url
		);
	}
	return url;
}
