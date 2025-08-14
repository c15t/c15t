import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

type DeployTarget = 'production' | 'staging';

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

function getBranch(env: NodeJS.ProcessEnv): string {
	const refEnv = env.GITHUB_REF || '';
	const headRef = env.GITHUB_HEAD_REF || '';
	if (headRef) return headRef;
	if (refEnv.startsWith('refs/heads/'))
		return refEnv.replace('refs/heads/', '');
	if (refEnv.startsWith('refs/tags/')) return refEnv.replace('refs/tags/', '');
	return 'unknown';
}

function determineTarget(
	env: NodeJS.ProcessEnv,
	args: Record<string, string | boolean>
): DeployTarget {
	const refEnv = env.GITHUB_REF || '';
	if (args.target === 'production' || args.prod === true) return 'production';
	if (args.target === 'staging') return 'staging';
	return refEnv === 'refs/heads/main' ? 'production' : 'staging';
}

function ensureEnv(varName: string, env: NodeJS.ProcessEnv): string {
	const value = env[varName] || loadEnvVarFromDotenv(varName);
	if (!value) {
		throw new Error(`Missing ${varName} in env.`);
	}
	return value;
}

function fileShouldBeIgnored(
	fileName: string,
	chosenLockfile: string | undefined,
	ignoreFiles: Set<string>
): boolean {
	if (chosenLockfile && fileName === chosenLockfile) return false;
	return ignoreFiles.has(fileName);
}

function chooseLockfile(cwd: string): string | undefined {
	const candidates = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'];
	return candidates.find((f) => fs.existsSync(path.join(cwd, f)));
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

function loadEnvVarFromDotenv(varName: string): string | undefined {
	if (process.env[varName]) return process.env[varName];
	loadDotenvOnce(process.cwd());
	return process.env[varName];
}

async function createDeployment() {
	const args = parseArgs(process.argv);
	const cwd = process.cwd();

	const token = ensureEnv('VERCEL_TOKEN', process.env);
	const project = ensureEnv('VERCEL_PROJECT_ID', process.env);
	const teamId = ensureEnv('VERCEL_ORG_ID', process.env);

	const repo = process.env.GITHUB_REPOSITORY || '';
	const owner = process.env.GITHUB_REPOSITORY_OWNER || '';
	const sha = process.env.GITHUB_SHA || '';
	const branch = getBranch(process.env);
	const target = determineTarget(process.env, args);

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
			source: 'script',
		},
		projectSettings: {
			framework: 'nextjs',
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

	const json = JSON.parse(resText) as { url?: string };
	const url = json.url ? `https://${json.url}` : '';
	if (!url) {
		throw new Error('Vercel did not return a deployment URL.');
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
