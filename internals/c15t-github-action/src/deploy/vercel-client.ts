import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import https from 'node:https';
import path from 'node:path';

// Precompiled regex for performance
const TOKEN_SPLIT_RE = /'([^']*)'|"([^"]*)"|[^\s]+/gm;
const BRANCH_TPL_RE = /\{\{\s*BRANCH\s*\}\}/g;
const PR_TPL_RE = /\{\{\s*PR_NUMBER\s*\}\}/g;
// Hoisted slugify regexes for performance
const RE_UNDERSCORE_OR_SPACE = /[_\s]+/g;
const RE_NON_WORD_EXCEPT_DASH = /[^\w-]+/g;
const RE_MULTI_DASH = /--+/g;
const RE_LEADING_DASH = /^-+/;
const RE_TRAILING_DASH = /-+$/;

/**
 * @internal
 * Deploy to Vercel v13 API with optional alias assignment via v2 API.
 * This module is bundled inside the GitHub Action to avoid external scripts.
 */

export type DeployTarget = 'production' | 'staging';

interface VercelDeployOptions {
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
	/** Multiple alias domains (templating supported, e.g. {{PR_NUMBER}}, {{BRANCH}}). */
	aliasDomains?: string[];
	/** Raw vercel-like args string to parse for -m/--meta key=value pairs. */
	vercelArgs?: string;
	/** Optional Vercel scope/team slug to include in metadata. */
	vercelScope?: string;
}

interface VercelDeployResult {
	url: string;
	id?: string;
}

/**
 * Determine the current branch from GitHub env vars.
 * @param env - Environment variables
 */
export function getBranch(env: NodeJS.ProcessEnv): string {
	const refEnv = env.GITHUB_REF || '';
	const headRef = env.GITHUB_HEAD_REF || '';
	if (headRef) {
		return headRef;
	}
	if (refEnv.startsWith('refs/heads/')) {
		return refEnv.replace('refs/heads/', '');
	}
	if (refEnv.startsWith('refs/tags/')) {
		return refEnv.replace('refs/tags/', '');
	}
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
	if (chosenLockfile && fileName === chosenLockfile) {
		return false;
	}
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
			if (entry.name.startsWith('.git')) {
				continue;
			}
			const fullPath = path.join(dir, entry.name);
			const relativePath = path.relative(cwd, fullPath);
			if (entry.isDirectory()) {
				if (ignoreDirs.has(entry.name)) {
					continue;
				}
				out.push(...walk(fullPath));
			} else if (entry.isFile()) {
				if (fileShouldBeIgnored(entry.name, chosenLockfile, ignoreFiles)) {
					continue;
				}
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

export function resolveTarget(env: NodeJS.ProcessEnv): DeployTarget {
	if (env.GITHUB_REF === 'refs/heads/main') {
		return 'production';
	}
	return 'staging';
}

function slugify(input: string): string {
	return input
		.toString()
		.trim()
		.toLowerCase()
		.replace(RE_UNDERSCORE_OR_SPACE, '-')
		.replace(RE_NON_WORD_EXCEPT_DASH, '')
		.replace(RE_MULTI_DASH, '-')
		.replace(RE_LEADING_DASH, '')
		.replace(RE_TRAILING_DASH, '');
}

function parseMetaArgs(raw: string | undefined): Record<string, string> {
	if (!raw) {
		return {};
	}
	const meta: Record<string, string> = {};
	const tokens = raw.match(TOKEN_SPLIT_RE) ?? [];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token === '-m' || token === '--meta') {
			const kv = tokens[i + 1] ?? '';
			i++;
			const eq = kv.indexOf('=');
			if (eq > 0) {
				const k = kv.slice(0, eq);
				const v = kv.slice(eq + 1).replace(/^"|"$/g, '');
				meta[k] = v;
			}
		}
	}
	return meta;
}

function templateAliasDomains(domains: string[] | undefined): string[] {
	if (!domains || domains.length === 0) {
		return [];
	}
	const prNumber = process.env.GITHUB_PR_NUMBER || '';
	const isPr = Boolean(prNumber);
	const ref = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF || '';
	const branch = slugify(ref.replace('refs/heads/', ''));
	return domains
		.map((d) => d.replace(BRANCH_TPL_RE, branch))
		.map((d) => (isPr ? d.replace(PR_TPL_RE, prNumber) : d))
		.filter((d) => !d.includes('{{'));
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
	let target: DeployTarget;
	if (typeof options.target === 'string' && options.target.trim() !== '') {
		target = options.target;
	} else {
		target = resolveTarget(process.env);
	}

	const repo = process.env.GITHUB_REPOSITORY || '';
	const owner = process.env.GITHUB_REPOSITORY_OWNER || '';
	const sha = process.env.GITHUB_SHA || '';

	const commitMessage = process.env.GITHUB_COMMIT_MESSAGE || '';
	const commitAuthorName = process.env.GITHUB_COMMIT_AUTHOR_NAME || '';
	const commitAuthorLogin =
		process.env.GITHUB_COMMIT_AUTHOR_LOGIN || process.env.GITHUB_ACTOR || '';
	// Email is intentionally omitted from metadata to avoid PII leakage
	const prNumber = process.env.GITHUB_PR_NUMBER || '';
	const prHeadRef =
		process.env.GITHUB_PR_HEAD_REF || process.env.GITHUB_HEAD_REF || '';
	const prBaseRef =
		process.env.GITHUB_PR_BASE_REF || process.env.GITHUB_BASE_REF || '';
	const includePrMeta = prNumber.trim().length > 0;

	const filesList = walkFiles(cwd);
	const files = filesList.map((file) => {
		const data = readFileSync(path.join(cwd, file));
		return {
			file: file.replace(/\\/g, '/'),
			data: data.toString('base64'),
			encoding: 'base64' as const,
		};
	});

	const additionalMeta = parseMetaArgs(options.vercelArgs);
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
			// githubCommitAuthorEmail intentionally omitted
			source: 'github',
			...(options.vercelScope ? { githubScope: options.vercelScope } : {}),
			...(includePrMeta
				? {
						githubPrNumber: prNumber,
						...(prHeadRef ? { githubPrHeadRef: prHeadRef } : {}),
						...(prBaseRef ? { githubPrBaseRef: prBaseRef } : {}),
					}
				: {}),
			...additionalMeta,
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

	// Assign alias if configured and branch matches. Support multiple domains with templating.
	const allAliases = [
		...(options.aliasDomain ? [options.aliasDomain] : []),
		...templateAliasDomains(options.aliasDomains),
	];
	if (
		allAliases.length &&
		options.aliasBranch &&
		getBranch(process.env) === options.aliasBranch &&
		json.id
	) {
		let canonicalSet = false;
		for (const domain of allAliases) {
			try {
				await new Promise<void>((resolve, reject) => {
					const aliasBody = JSON.stringify({ alias: domain });
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
										`Failed to alias domain ${domain}: ${res.statusCode}\n${txt}`
									)
								);
							});
						}
					);
					req.on('error', (err) => reject(err));
					req.write(aliasBody);
					req.end();
				});
				// Prefer the first alias as the canonical URL
				if (!canonicalSet && domain?.includes('.')) {
					url = `https://${domain}`;
					canonicalSet = true;
				}
			} catch {
				// ignore alias errors and continue
			}
		}
	}

	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
		appendFileSync(process.env.GITHUB_OUTPUT, `deployment_url=${url}\n`);
	}
	return { url, id: json.id };
}
