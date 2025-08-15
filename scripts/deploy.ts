import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

/**
 * Creates a Vercel deployment by walking the target directory, encoding files,
 * and calling the Vercel Deployments API (v13). Optionally assigns a domain
 * alias via the v2 Aliases API when configured. Designed for CI usage.
 *
 * Environment variables consumed:
 * - `VERCEL_TOKEN` (required)
 * - `VERCEL_PROJECT_ID` (required)
 * - `VERCEL_ORG_ID` (required)
 * - `VERCEL_FRAMEWORK` (optional; defaults to `nextjs`)
 * - `C15T_DEPLOY_ALIAS` (optional; domain alias to assign, e.g. canary.c15t.com)
 * - `C15T_DEPLOY_ALIAS_BRANCH` (optional; branch that triggers alias assignment)
 * - Standard GitHub envs for metadata (e.g. `GITHUB_REF`, `GITHUB_SHA`, ...)
 *
 * Command line flags:
 * - `--target=production|staging` to force deploy target. If omitted, target is
 *   derived from `GITHUB_REF` (production for `refs/heads/main`, else staging).
 *
 * Output:
 * - Appends `url=...` to `GITHUB_OUTPUT` if present.
 *
 * @throws {Error} When required env vars are missing
 * @throws {Error} When Vercel API responds with a non-2xx status
 *
 * @example
 * // In CI (from ".docs" directory):
 * //   VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID must be set in env.
 * //   This script writes `url` to GitHub output.
 * //   node ../scripts/deploy.ts --target=staging
 */

type DeployTarget = 'production' | 'staging';

/**
 * Parses CLI flags of the form `--key=value` or `--flag` into a record.
 *
 * @param argv - Raw `process.argv`
 * @returns Map of argument names to string or boolean values
 */
function parseArgs(argv: string[]) {
	const args: Record<string, string | boolean> = {};
	for (const token of argv.slice(2)) {
		if (token.startsWith('--')) {
			const [key, value] = token.slice(2).split('=');
			if (value === undefined) {
				args[key] = true;
			} else {
				args[key] = value;
			}
		}
	}
	return args;
}

/**
 * Resolves the current branch name from GitHub Actions environment variables.
 *
 * @param env - Process environment
 * @returns Branch or tag name; `unknown` when not derivable
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

/**
 * Determines the Vercel deployment target based on CLI args and branch.
 *
 * @param env - Process environment used to infer branch
 * @param args - CLI arguments map
 * @returns The resolved deployment target
 */
function determineTarget(
	env: NodeJS.ProcessEnv,
	args: Record<string, string | boolean>
): DeployTarget {
	const refEnv = env.GITHUB_REF || '';
	if (args.target === 'production' || args.prod === true) return 'production';
	if (args.target === 'staging') return 'staging';
	return refEnv === 'refs/heads/main' ? 'production' : 'staging';
}

/**
 * Retrieves a required environment variable or throws a descriptive error.
 * It also falls back to reading from `.env` and `.env.local` once per process.
 *
 * @param varName - Variable name to read
 * @param env - Process environment
 * @returns The non-empty environment variable value
 * @throws {Error} When the variable is not defined
 */
function ensureEnv(varName: string, env: NodeJS.ProcessEnv): string {
	const value = env[varName] || loadEnvVarFromDotenv(varName);
	if (!value) {
		throw new Error(`Missing ${varName} in env.`);
	}
	return value;
}

/**
 * Predicate indicating whether a file should be excluded from the upload set.
 *
 * @param fileName - Basename of the file
 * @param chosenLockfile - The primary lockfile to include even if normally ignored
 * @param ignoreFiles - Set of filenames to ignore
 * @returns True when the file should be skipped
 */
function fileShouldBeIgnored(
	fileName: string,
	chosenLockfile: string | undefined,
	ignoreFiles: Set<string>
): boolean {
	if (chosenLockfile && fileName === chosenLockfile) return false;
	return ignoreFiles.has(fileName);
}

/**
 * Chooses the primary lockfile if present in the given working directory.
 *
 * @param cwd - Working directory
 * @returns The lockfile name or `undefined` when none found
 */
function chooseLockfile(cwd: string): string | undefined {
	const candidates = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'];
	return candidates.find((f) => fs.existsSync(path.join(cwd, f)));
}

/**
 * Recursively enumerates files for deployment, excluding standard build and
 * cache directories. Ensures `package.json` and the selected lockfile are
 * always included when present.
 *
 * @param cwd - Working directory to scan
 * @returns Array of file paths relative to `cwd`
 */
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
		const entries = fs.readdirSync(dir, { withFileTypes: true });
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
	// Ensure we always include package.json and the chosen lockfile if present
	if (
		!filesList.includes('package.json') &&
		fs.existsSync(path.join(cwd, 'package.json'))
	) {
		filesList.push('package.json');
	}
	if (
		chosenLockfile &&
		!filesList.includes(chosenLockfile) &&
		fs.existsSync(path.join(cwd, chosenLockfile))
	) {
		filesList.push(chosenLockfile);
	}
	return filesList;
}

let dotenvLoaded = false;
/**
 * Loads a simple `.env`-style file with `KEY=VALUE` pairs into an object.
 * Supports quotes and `export KEY=VALUE` syntax; ignores comments and blanks.
 *
 * @param filePath - Absolute path to the env file
 * @returns Map of parsed environment entries
 */
function parseEnvFile(filePath: string): Record<string, string> {
	const out: Record<string, string> = {};
	if (!fs.existsSync(filePath)) return out;
	const content = fs.readFileSync(filePath, 'utf8');
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const cleaned = line.startsWith('export ') ? line.slice(7) : line;
		const eq = cleaned.indexOf('=');
		if (eq === -1) continue;
		const key = cleaned.slice(0, eq).trim();
		let value = cleaned.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		out[key] = value;
	}
	return out;
}

/**
 * Loads `.env` and `.env.local` once per process, merging variables without
 * overriding existing `process.env` entries.
 *
 * @param cwd - Working directory where env files live
 */
function loadDotenvOnce(cwd: string): void {
	if (dotenvLoaded) return;
	const envPath = path.join(cwd, '.env');
	const envLocalPath = path.join(cwd, '.env.local');
	const base = parseEnvFile(envPath);
	const local = parseEnvFile(envLocalPath);
	const merged = { ...base, ...local };
	for (const [k, v] of Object.entries(merged)) {
		if (process.env[k] === undefined) {
			process.env[k] = v;
		}
	}
	dotenvLoaded = true;
}

/**
 * Retrieves a variable from `process.env`; if missing, loads `.env` files and
 * tries again.
 *
 * @param varName - Variable name
 * @returns The value or `undefined` when not set
 */
function loadEnvVarFromDotenv(varName: string): string | undefined {
	if (process.env[varName]) return process.env[varName];
	loadDotenvOnce(process.cwd());
	return process.env[varName];
}

/**
 * Main entry point. Builds the deployment payload, calls the Vercel API,
 * optionally assigns an alias, writes the result URL to GitHub outputs, and
 * logs a concise summary.
 *
 * @throws {Error} When required env vars are missing
 * @throws {Error} When Vercel API responds with an error status
 */
async function createDeployment() {
	const args = parseArgs(process.argv);
	const cwd = process.cwd();

	const token = ensureEnv('VERCEL_TOKEN', process.env);
	const project = ensureEnv('VERCEL_PROJECT_ID', process.env);
	const teamId = ensureEnv('VERCEL_ORG_ID', process.env);
	const framework = process.env.VERCEL_FRAMEWORK || 'nextjs';

	const repo = process.env.GITHUB_REPOSITORY || '';
	const owner = process.env.GITHUB_REPOSITORY_OWNER || '';
	const sha = process.env.GITHUB_SHA || '';
	const branch = getBranch(process.env);
	const target = determineTarget(process.env, args);
	const aliasDomain = process.env.C15T_DEPLOY_ALIAS || '';
	const aliasBranch = process.env.C15T_DEPLOY_ALIAS_BRANCH || '';

	// Optional Git metadata propagated from the CI environment
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
		const data = fs.readFileSync(path.join(cwd, file));
		return {
			file: file.replace(/\\/g, '/'),
			data: data.toString('base64'),
			encoding: 'base64' as const,
		};
	});

	const body = JSON.stringify({
		name: 'c15t',
		project,
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
			framework,
		},
	});

	const requestPath = `/v13/deployments?teamId=${encodeURIComponent(teamId)}`;

	const resText: string = await new Promise((resolve, reject) => {
		const req = https.request(
			{
				hostname: 'api.vercel.com',
				path: requestPath,
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
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

	// Optionally assign an alias when the current branch matches the configured value
	if (aliasDomain && aliasBranch && branch === aliasBranch && json.id) {
		try {
			await new Promise<void>((resolve, reject) => {
				const aliasBody = JSON.stringify({ alias: aliasDomain });
				const req = https.request(
					{
						hostname: 'api.vercel.com',
						path: `/v2/deployments/${encodeURIComponent(json.id as string)}/aliases?teamId=${encodeURIComponent(teamId)}`,
						method: 'POST',
						headers: {
							Authorization: `Bearer ${token}`,
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
									`Failed to alias domain ${aliasDomain}: ${res.statusCode}\n${txt}`
								)
							);
						});
					}
				);
				req.on('error', (err) => reject(err));
				req.write(aliasBody);
				req.end();
			});
			url = `https://${aliasDomain}`;
			console.log(`Assigned alias ${aliasDomain} to deployment.`);
		} catch (err) {
			console.warn(
				`Warning: could not assign alias ${aliasDomain}. Using deployment URL instead.`,
				err instanceof Error ? err.message : err
			);
		}
	}

	// Write to GitHub Actions output if available
	if (process.env.GITHUB_OUTPUT) {
		fs.appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
	}
	console.log(`Created Vercel deployment: ${url}`);
}

createDeployment().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
