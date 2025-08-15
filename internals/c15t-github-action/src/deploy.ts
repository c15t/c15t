import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import https from 'node:https';
import path from 'node:path';

/**
 * @internal
 * Deploy to Vercel v13 API with optional alias assignment via v2 API.
 * This module is bundled inside the GitHub Action to avoid external scripts.
 */

export type DeployTarget = 'production' | 'staging';

export interface VercelDeployOptions {
	token: string;
	projectId: string;
	orgId: string;
	workingDirectory: string;
	framework?: string;
	/**
	 * Target can be provided explicitly. If omitted, it will be resolved as
	 * production when branch is `main`, otherwise staging.
	 */
	target?: DeployTarget;
	/** Optional alias domain to assign (e.g. canary.c15t.com). */
	aliasDomain?: string;
	/** Branch name that must match to assign the alias (e.g. canary). */
	aliasBranch?: string;
}

export interface VercelDeployResult {
	url: string;
	id?: string;
}

/**
 * Determine the current branch from GitHub env vars.
 * @param env - Environment variables
 */
function getBranch(env: NodeJS.ProcessEnv): string {
	const refEnv = env.GITHUB_REF || '';
	const headRef = env.GITHUB_HEAD_REF || '';
	if (headRef) return headRef;
	if (refEnv.startsWith('refs/heads/'))
		return refEnv.replace('refs/heads/', '');
	if (refEnv.startsWith('refs/tags/')) return refEnv.replace('refs/tags/', '');
	return 'unknown';
}

function chooseLockfile(cwd: string): string | undefined {
	const candidates = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'];
	return candidates.find((f) => existsSync(path.join(cwd, f)));
}

function fileShouldBeIgnored(
	fileName: string,
	chosenLockfile: string | undefined,
	ignoreFiles: Set<string>
): boolean {
	if (chosenLockfile && fileName === chosenLockfile) return false;
	return ignoreFiles.has(fileName);
}

function walkFiles(cwd: string): string[] {
	const ignoreDirs = new Set([
		'node_modules',
		'.git',
		'.next',
		'.vercel',
		'out',
		'dist',
		'build',
		'.cache',
		'.turbo',
	]);
	const ignoreFiles = new Set([
		'pnpm-lock.yaml',
		'yarn.lock',
		'package-lock.json',
	]);
	const chosenLockfile = chooseLockfile(cwd);

	function walk(dir: string): string[] {
		const entries = readdirSync(dir, { withFileTypes: true });
		const out: string[] = [];
		for (const entry of entries) {
			if (entry.name.startsWith('.git')) continue;
			const fullPath = path.join(dir, entry.name);
			const relativePath = path.relative(cwd, fullPath);
			if (entry.isDirectory()) {
				if (ignoreDirs.has(entry.name)) continue;
				out.push(...walk(fullPath));
			} else if (entry.isFile()) {
				if (fileShouldBeIgnored(entry.name, chosenLockfile, ignoreFiles))
					continue;
				out.push(relativePath);
			}
		}
		return out;
	}

	const filesList = walk(cwd);
	if (
		!filesList.includes('package.json') &&
		existsSync(path.join(cwd, 'package.json'))
	) {
		filesList.push('package.json');
	}
	if (
		chosenLockfile &&
		!filesList.includes(chosenLockfile) &&
		existsSync(path.join(cwd, chosenLockfile))
	) {
		filesList.push(chosenLockfile);
	}
	return filesList;
}

function resolveTarget(env: NodeJS.ProcessEnv): DeployTarget {
	return env.GITHUB_REF === 'refs/heads/main' ? 'production' : 'staging';
}

/**
 * Deploys the directory at `workingDirectory` to Vercel using the v13 API.
 * Optionally assigns an alias domain if `aliasDomain` and `aliasBranch` match.
 *
 * @param options - Deployment parameters
 * @returns Deployment result including public URL
 * @throws {Error} When HTTP requests fail or URL is missing in the response
 */
export async function deployToVercel(
	options: VercelDeployOptions
): Promise<VercelDeployResult> {
	const cwd = path.resolve(options.workingDirectory || '.');
	const branch = getBranch(process.env);
	const target = options.target ?? resolveTarget(process.env);

	const repo = process.env.GITHUB_REPOSITORY || '';
	const owner = process.env.GITHUB_REPOSITORY_OWNER || '';
	const sha = process.env.GITHUB_SHA || '';

	const commitMessage = process.env.GITHUB_COMMIT_MESSAGE || '';
	const commitAuthorName = process.env.GITHUB_COMMIT_AUTHOR_NAME || '';
	const commitAuthorLogin =
		process.env.GITHUB_COMMIT_AUTHOR_LOGIN || process.env.GITHUB_ACTOR || '';
	const commitAuthorEmail = process.env.GITHUB_COMMIT_AUTHOR_EMAIL || '';
	const prNumber = process.env.GITHUB_PR_NUMBER || '';
	const prHeadRef =
		process.env.GITHUB_PR_HEAD_REF || process.env.GITHUB_HEAD_REF || '';
	const prBaseRef =
		process.env.GITHUB_PR_BASE_REF || process.env.GITHUB_BASE_REF || '';

	const filesList = walkFiles(cwd);
	const files = filesList.map((file) => {
		const data = readFileSync(path.join(cwd, file));
		return {
			file: file.replace(/\\/g, '/'),
			data: data.toString('base64'),
			encoding: 'base64' as const,
		};
	});

	const body = JSON.stringify({
		name: 'c15t',
		project: options.projectId,
		target,
		files,
		meta: {
			githubCommitRef: branch,
			githubCommitSha: sha,
			githubRepo: repo.split('/')[1] || '',
			githubOrg: owner || '',
			githubCommitMessage: commitMessage,
			githubCommitAuthorName: commitAuthorName,
			githubCommitAuthorLogin: commitAuthorLogin,
			githubCommitAuthorEmail: commitAuthorEmail,
			githubPrId: prNumber,
			githubPrHeadRef: prHeadRef,
			githubPrBaseRef: prBaseRef,
			source: 'github',
		},
		projectSettings: {
			framework: options.framework || 'nextjs',
		},
	});

	const requestPath = `/v13/deployments?teamId=${encodeURIComponent(options.orgId)}`;

	const resText: string = await new Promise((resolve, reject) => {
		const req = https.request(
			{
				hostname: 'api.vercel.com',
				path: requestPath,
				method: 'POST',
				headers: {
					Authorization: `Bearer ${options.token}`,
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(body),
				},
			},
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (d) => chunks.push(d));
				res.on('end', () => {
					const txt = Buffer.concat(chunks).toString('utf8');
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						return resolve(txt);
					}
					return reject(
						new Error(`Vercel API error: ${res.statusCode}\n${txt}`)
					);
				});
			}
		);
		req.on('error', (err) => reject(err));
		req.write(body);
		req.end();
	});

	const json = JSON.parse(resText) as { url?: string; id?: string };
	let url = json.url ? `https://${json.url}` : '';
	if (!url) {
		throw new Error('Vercel did not return a deployment URL.');
	}

	// Assign alias if configured and branch matches
	if (
		options.aliasDomain &&
		options.aliasBranch &&
		getBranch(process.env) === options.aliasBranch &&
		json.id
	) {
		try {
			await new Promise<void>((resolve, reject) => {
				const aliasBody = JSON.stringify({ alias: options.aliasDomain });
				const req = https.request(
					{
						hostname: 'api.vercel.com',
						path: `/v2/deployments/${encodeURIComponent(json.id as string)}/aliases?teamId=${encodeURIComponent(options.orgId)}`,
						method: 'POST',
						headers: {
							Authorization: `Bearer ${options.token}`,
							'Content-Type': 'application/json',
							'Content-Length': Buffer.byteLength(aliasBody),
						},
					},
					(res) => {
						const chunks: Buffer[] = [];
						res.on('data', (d) => chunks.push(d));
						res.on('end', () => {
							const txt = Buffer.concat(chunks).toString('utf8');
							if (
								res.statusCode &&
								res.statusCode >= 200 &&
								res.statusCode < 300
							) {
								resolve();
								return;
							}
							reject(
								new Error(
									`Failed to alias domain ${options.aliasDomain}: ${res.statusCode}\n${txt}`
								)
							);
						});
					}
				);
				req.on('error', (err) => reject(err));
				req.write(aliasBody);
				req.end();
			});
			url = `https://${options.aliasDomain}`;
		} catch {
			// Swallow alias errors and keep the original URL
		}
	}

	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
	}
	return { url, id: json.id };
}
