#!/usr/bin/env tsx

const log = console.log;
const error = console.error;

/**
 * Unified Documentation Fetcher for C15t
 *
 * This script handles both local development setup and production builds for the
 * documentation site. It fetches a private Next.js documentation template from
 * GitHub and configures it for either development or production deployment.
 *
 * **Default Mode (Development):**
 * - Loads token from `.env` file
 * - Sets up .docs for immediate `pnpm dev` usage
 * - Skips workspace dependencies and production build
 *
 * **Production Mode (--vercel flag):**
 * - Uses environment CONSENT_GIT_TOKEN
 * - Skips all pnpm installs (Vercel handles installs)
 * - Skips content processing (handled in template/build)
 * - Skips building; Vercel will run the build during deployment
 *
 * **Branch Selection (--branch flag):**
 * - Defaults to 'main' branch
 * - Use --branch=canary for canary releases
 * - Use --branch=develop for development branch
 *
 * @author Generated for C15t workspace
 * @version 2.1.0
 * @since 2025
 *
 * @see {@link https://c15t.com/docs/contributing/documentation-setup | Setup Documentation}
 * @see {@link https://vercel.com/docs/deployments/build-step | Vercel Build Step Documentation}
 * @see {@link https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens | GitHub Token Management}
 *
 * @requires CONSENT_GIT_TOKEN environment variable (production) or .env file (development)
 * @requires pnpm package manager for dependency management
 * @requires git for repository cloning operations
 * @requires rsync for efficient file synchronization
 *
 * @throws {ProcessExitError} When CONSENT_GIT_TOKEN is missing or invalid
 * @throws {FetchScriptError} When any fetch step fails
 *
 * @example
 * ```bash
 * # Development setup (default branch: main)
 * tsx scripts/setup-docs.ts
 * pnpm setup:docs
 *
 * # Development setup with canary branch
 * tsx scripts/setup-docs.ts --branch=canary
 * pnpm setup:docs -- --branch=canary
 *
 * # Production build for Vercel
 * tsx scripts/setup-docs.ts --vercel
 * CONSENT_GIT_TOKEN=xxx tsx scripts/setup-docs.ts --vercel --branch=canary
 * ```
 */

import { execSync, spawnSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { exit } from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * Type definitions for unified fetch process
 */

/**
 * Represents a file system path with semantic meaning
 */
type FileSystemPath = string;

/**
 * Represents a GitHub authentication token
 */
type GitHubToken = string;

/**
 * Represents a shell command string
 */
type ShellCommand = string;

/**
 * Represents a human-readable description of an operation
 */
type OperationDescription = string;

/**
 * Build mode configuration
 */
type BuildMode = 'development' | 'production';

/**
 * Git branch name for documentation template
 */
type GitBranch = string;

/**
 * GitHub repository full name (owner/repo)
 */
type GitHubRepoFullName = string;

/**
 * Configuration object for fetch process
 */
interface FetchConfiguration {
	/** Temporary directory for cloning the documentation template */
	readonly TEMP_DOCS_DIR: FileSystemPath;
	/** Target directory where the docs app will be placed in workspace */
	readonly DOCS_APP_DIR: FileSystemPath;
	/** GitHub repository URL for the private documentation template */
	readonly DOCS_REPO_URL: string;
	/** Default branch to fetch from */
	readonly DEFAULT_BRANCH: GitBranch;
}

/**
 * Build options parsed from command line arguments
 */
interface FetchOptions {
	/** Whether this is a production build for Vercel */
	readonly isProduction: boolean;
	/** Build mode derived from flags */
	readonly mode: BuildMode;
	/** Git branch to fetch from */
	readonly branch: GitBranch;
	/** When true, prints resolved settings and exits before side effects */
	readonly dryRun: boolean;
}

type PullSourceKind = 'github-pr' | 'explicit-branch' | 'default-branch';

type PullSource = {
	readonly kind: PullSourceKind;
	readonly branch: GitBranch;
	readonly repo?: GitHubRepoFullName;
};

/**
 * Custom error class for fetch process failures
 */
class FetchScriptError extends Error {
	/** The fetch step where the error occurred */
	readonly step: string;
	/** The command that failed (if applicable) */
	readonly command?: string;
	/** The build mode when error occurred */
	readonly mode: BuildMode;
	/** The branch being fetched when error occurred */
	readonly branch: GitBranch;

	constructor(
		message: string,
		step: string,
		mode: BuildMode,
		branch: GitBranch,
		command?: string
	) {
		super(message);
		this.name = 'FetchScriptError';
		this.step = step;
		this.mode = mode;
		this.branch = branch;
		this.command = command;
	}
}

/**
 * Immutable configuration constants for the fetch process
 */
const FETCH_CONFIG: FetchConfiguration = {
	TEMP_DOCS_DIR: join(tmpdir(), 'c15t-docs'),
	DOCS_APP_DIR: '.docs',
	DOCS_REPO_URL: 'https://github.com/consentdotio/monorepo.git',
	DEFAULT_BRANCH: 'main',
} as const;

/**
 * Parses command line arguments to determine fetch options
 *
 * This function analyzes the process arguments to determine whether this is
 * a development setup or production build, and which branch to fetch from.
 * The default behavior is development mode with the main branch.
 *
 * @returns Parsed fetch options with mode, production flag, and branch
 *
 * @example
 * ```typescript
 * // Default development mode, main branch
 * const options = parseFetchOptions();
 * // { isProduction: false, mode: 'development', branch: 'main' }
 *
 * // Production mode with canary branch
 * const options = parseFetchOptions(); // --vercel --branch=canary
 * // { isProduction: true, mode: 'production', branch: 'canary' }
 * ```
 */
function parseFetchOptions(): FetchOptions {
	const isProduction = process.argv.includes('--vercel');
	const dryRun = process.argv.includes('--dry-run');

	// Parse branch flag: --branch=canary or --branch canary
	let branch = resolveDefaultTemplateBranch();
	const branchFlag = process.argv.find((arg) => arg.startsWith('--branch'));

	if (branchFlag) {
		if (branchFlag.includes('=')) {
			// Format: --branch=canary
			branch = branchFlag.split('=')[1];
		} else {
			// Format: --branch canary
			const branchIndex = process.argv.indexOf(branchFlag);
			if (branchIndex !== -1 && branchIndex + 1 < process.argv.length) {
				branch = process.argv[branchIndex + 1];
			}
		}
	}

	return {
		isProduction,
		mode: (() => {
			if (isProduction) {
				return 'production';
			}
			return 'development';
		})(),
		branch: branch || FETCH_CONFIG.DEFAULT_BRANCH,
		dryRun,
	};
}

type GitHubPullRequestEventPayload = {
	readonly pull_request?: {
		readonly base?: { readonly ref?: string };
		readonly head?: {
			readonly ref?: string;
			readonly repo?: { readonly full_name?: string };
		};
	};
};

function readGitHubEventPayload(): GitHubPullRequestEventPayload | undefined {
	const eventPath = process.env.GITHUB_EVENT_PATH;
	if (!eventPath) {
		return undefined;
	}
	try {
		const raw = readFileSync(eventPath, 'utf8');
		return JSON.parse(raw) as GitHubPullRequestEventPayload;
	} catch {
		return undefined;
	}
}

function resolveBranchFromEnvRef(githubRef: string | undefined): string {
	if (!githubRef) {
		return '';
	}
	if (githubRef.startsWith('refs/heads/')) {
		return githubRef.replace('refs/heads/', '');
	}
	if (githubRef.startsWith('refs/tags/')) {
		return githubRef.replace('refs/tags/', '');
	}
	return '';
}

function resolveDefaultTemplateBranch(): GitBranch {
	// When the caller explicitly provided `--branch`, parseFetchOptions() will
	// read it and override whatever we return here.
	const eventName = process.env.GITHUB_EVENT_NAME || '';
	const isPullRequestEvent =
		eventName === 'pull_request' || eventName === 'pull_request_target';

	if (isPullRequestEvent) {
		// For PR previews, the template should follow the PR base branch
		// (main/canary), while content is pulled from the PR head branch.
		const payload = readGitHubEventPayload();
		const payloadBaseRef = payload?.pull_request?.base?.ref || '';
		const envBaseRef = process.env.GITHUB_BASE_REF || '';
		const baseRef = payloadBaseRef || envBaseRef;
		if (baseRef) {
			return baseRef;
		}
		return FETCH_CONFIG.DEFAULT_BRANCH;
	}

	// For push/schedule/manual runs, prefer the current ref name if present.
	const refName = process.env.GITHUB_REF_NAME || '';
	if (refName) {
		return refName;
	}
	const fromRef = resolveBranchFromEnvRef(process.env.GITHUB_REF);
	if (fromRef) {
		return fromRef;
	}
	return FETCH_CONFIG.DEFAULT_BRANCH;
}

function resolvePullSource(fetchOptions: FetchOptions): PullSource {
	const eventName = process.env.GITHUB_EVENT_NAME || '';
	const isPullRequestEvent =
		eventName === 'pull_request' || eventName === 'pull_request_target';
	if (isPullRequestEvent) {
		const payload = readGitHubEventPayload();
		const envHeadRef = process.env.GITHUB_HEAD_REF || '';
		const payloadHeadRef = payload?.pull_request?.head?.ref || '';
		const headRef = payloadHeadRef || envHeadRef;

		const payloadHeadRepo = payload?.pull_request?.head?.repo?.full_name || '';
		const envRepo = process.env.GITHUB_REPOSITORY || '';
		const repo = payloadHeadRepo || envRepo;

		if (!headRef) {
			return { kind: 'default-branch', branch: fetchOptions.branch };
		}
		if (!repo) {
			return { kind: 'github-pr', branch: headRef };
		}

		return { kind: 'github-pr', branch: headRef, repo };
	}

	// Non-PR events: allow explicit `--branch` to control which branch we pull
	// content from (and it also controls the template branch elsewhere).
	const explicitBranchFlag = process.argv.some((arg) =>
		arg.startsWith('--branch')
	);
	if (explicitBranchFlag) {
		return { kind: 'explicit-branch', branch: fetchOptions.branch };
	}

	return { kind: 'default-branch', branch: fetchOptions.branch };
}

/**
 * Validates and retrieves GitHub authentication token based on build mode
 *
 * This function handles token acquisition differently based on the build mode:
 * - **Development**: Loads from `.env` file using Node.js native support
 * - **Production**: Uses environment variable directly (Vercel secrets)
 *
 * @param buildMode - The current build mode (development or production)
 * @param branch - The branch being fetched (for error context)
 * @returns The validated GitHub authentication token
 *
 * @throws {ProcessExitError} When token is missing or invalid
 * @throws {ProcessExitError} When .env file cannot be loaded (development mode)
 *
 * @example
 * ```typescript
 * // Development mode - loads from .env
 * const token = validateGitHubToken('development', 'main');
 *
 * // Production mode - uses environment variable
 * const token = validateGitHubToken('production', 'canary');
 * ```
 *
 * @see {@link https://nodejs.org/api/process.html#processloadenvfilepath | Node.js loadEnvFile Documentation}
 * @see {@link https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens | GitHub Personal Access Tokens}
 */
function validateGitHubToken(
	buildMode: BuildMode,
	branch: GitBranch
): GitHubToken {
	let token: string | undefined;

	if (buildMode === 'development') {
		// Development mode: Load from .env file
		try {
			process.loadEnvFile();
			token = process.env.CONSENT_GIT_TOKEN;
		} catch {
			throw new FetchScriptError(
				'Failed to load .env file. Ensure .env exists with CONSENT_GIT_TOKEN',
				'token_validation',
				buildMode,
				branch
			);
		}
	} else {
		// Production mode: Use environment variable directly
		token = process.env.CONSENT_GIT_TOKEN;
	}

	if (!token || token.trim() === '') {
		const advisory =
			'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens';
		const msg =
			buildMode === 'production'
				? `CONSENT_GIT_TOKEN missing. Set it in the environment. ${advisory}`
				: `CONSENT_GIT_TOKEN missing. Add it to your .env file. ${advisory}`;
		throw new FetchScriptError(msg, 'token_validation', buildMode, branch);
	}

	log(
		`✅ GitHub token found, proceeding with ${buildMode} build (${branch} branch)...`
	);
	return token;
}

/**
 * Safely removes a directory if it exists, preventing build conflicts
 *
 * This function provides idempotent directory cleanup that prevents conflicts
 * from previous build attempts. It safely handles cases where the target
 * directory doesn't exist and provides clear logging for debugging purposes.
 *
 * @param directoryPath - Absolute or relative path to the directory to remove
 * @param description - Human-readable description for logging and debugging
 * @param buildMode - Current build mode for error context
 * @param branch - Current branch for error context
 *
 * @throws {FetchScriptError} When directory removal fails due to permission or file system issues
 *
 * @example
 * ```typescript
 * cleanupDirectory('/tmp/build-cache', 'temporary build cache', 'development', 'main');
 * cleanupDirectory('.docs', 'existing docs application', 'production', 'canary');
 * ```
 *
 * @see {@link https://nodejs.org/api/fs.html#fsrmsyncpath-options | Node.js rmSync Documentation}
 */
function cleanupDirectory(
	directoryPath: FileSystemPath,
	description: OperationDescription,
	buildMode: BuildMode,
	branch: GitBranch
): void {
	if (existsSync(directoryPath)) {
		log(`🧹 Cleaning up existing ${description} at ${directoryPath}`);

		try {
			rmSync(directoryPath, { recursive: true, force: true });
		} catch {
			throw new FetchScriptError(
				`Failed to clean up directory: ${directoryPath}`,
				'cleanup',
				buildMode,
				branch,
				`rmSync(${directoryPath})`
			);
		}
	}
}

/**
 * Ensures pnpm is available in the PATH, enabling it via corepack if necessary
 *
 * This function checks if pnpm is available and executable. If not found, it
 * attempts to enable pnpm via Node.js corepack, which is the recommended way
 * to manage package managers in modern Node.js environments.
 *
 * @param buildMode - Current build mode for error context
 * @param branch - Current branch for error context
 *
 * @throws {FetchScriptError} When pnpm cannot be found and corepack enable fails
 * @throws {FetchScriptError} When corepack prepare fails to activate pnpm
 *
 * @example
 * ```typescript
 * ensurePnpmAvailable('development', 'main');
 * // pnpm is now guaranteed to be available
 * ```
 *
 * @see {@link https://nodejs.org/api/corepack.html | Node.js Corepack Documentation}
 * @see {@link https://pnpm.io/installation | PNPM Installation Guide}
 */
function ensurePnpmAvailable(buildMode: BuildMode, branch: GitBranch): void {
	// Check if pnpm is already available
	try {
		execSync('pnpm --version', { stdio: 'ignore' });
		return;
	} catch {
		// pnpm not found, try to enable via corepack
	}

	log('📦 pnpm not found; attempting to enable via corepack...');

	try {
		execSync('corepack enable', { stdio: 'inherit' });
	} catch {
		throw new FetchScriptError(
			'Failed to enable corepack. Ensure Node.js 16.10+ is installed.',
			'pnpm_setup',
			buildMode,
			branch,
			'corepack enable'
		);
	}

	try {
		// Use the same pnpm version as specified in the workflow
		execSync('corepack prepare pnpm@10.8.0 --activate', { stdio: 'inherit' });
		log('✅ pnpm enabled successfully via corepack');
	} catch {
		throw new FetchScriptError(
			'Failed to prepare pnpm via corepack. Check Node.js version compatibility.',
			'pnpm_setup',
			buildMode,
			branch,
			'corepack prepare pnpm@10.8.0 --activate'
		);
	}
}

/**
 * Executes a shell command with comprehensive error handling and logging
 *
 * This function provides a robust wrapper around Node.js `execSync` with
 * enhanced error handling, progress logging, and structured error reporting.
 * All commands are executed synchronously to maintain proper build step
 * sequencing and enable immediate error detection.
 *
 * @param command - The shell command string to execute
 * @param description - Human-readable description of the operation for logging
 * @param buildMode - Current build mode for error context
 * @param branch - Current branch for error context
 *
 * @throws {FetchScriptError} When the command execution fails with non-zero exit code
 * @throws {FetchScriptError} When the command cannot be spawned or found
 *
 * @example
 * ```typescript
 * executeCommand(
 *   'pnpm install --frozen-lockfile',
 *   'Installing workspace dependencies',
 *   'production',
 *   'main'
 * );
 * ```
 *
 * @see {@link https://nodejs.org/api/child_process.html#child_processexecsynccommand-options | Node.js execSync Documentation}
 */
function executeCommand(
	command: ShellCommand,
	description: OperationDescription,
	buildMode: BuildMode,
	branch: GitBranch,
	options?: { redact?: string[]; silent?: boolean }
): void {
	const toRedact = options?.redact ?? [];
	const sanitized = toRedact.reduce(
		(cmd, secret) => (secret ? cmd.split(secret).join('***') : cmd),
		command
	);
	log(`🔄 ${description}...`);
	if (!options?.silent) {
		log(`   Running: ${sanitized}`);
	}

	try {
		execSync(command, { stdio: 'inherit' });
		log(`✅ ${description} completed successfully`);
	} catch {
		error(`❌ Failed during: ${description}`);
		if (!options?.silent) {
			error(`   Command: ${sanitized}`);
		}

		throw new FetchScriptError(
			`Command execution failed: ${description}`,
			'command_execution',
			buildMode,
			branch,
			sanitized
		);
	}
}

/**
 * Attempts to clone a git repository branch, capturing error output to detect branch-not-found errors
 *
 * @param command - The git clone command to execute
 * @param buildMode - Current build mode for error context
 * @param branch - Branch being cloned
 * @param redact - Secrets to redact from error messages
 * @returns true if clone succeeded, false if branch not found
 * @throws {FetchScriptError} For other errors
 */
function tryCloneBranch(
	command: ShellCommand,
	buildMode: BuildMode,
	branch: GitBranch,
	redact: string[]
): boolean {
	// Use spawnSync with shell to properly handle quoted arguments
	const result = spawnSync(command, [], {
		shell: true,
		stdio: ['inherit', 'inherit', 'pipe'],
		encoding: 'utf8',
		maxBuffer: 10 * 1024 * 1024, // 10MB buffer
	});

	if (result.status === 0) {
		return true;
	}

	// Check stderr for branch-not-found error
	// With encoding: 'utf8', stderr should be a string
	const stderr = String(result.stderr || '');
	const isBranchNotFound =
		stderr.includes('Remote branch') &&
		stderr.includes('not found in upstream origin');

	if (isBranchNotFound) {
		return false;
	}

	// For other errors, throw a proper FetchScriptError
	const sanitized = redact.reduce(
		(cmd, secret) => (secret ? cmd.split(secret).join('***') : cmd),
		command
	);
	throw new FetchScriptError(
		`Command execution failed: git clone${stderr ? ` - ${stderr.substring(0, 200)}` : ''}`,
		'command_execution',
		buildMode,
		branch,
		sanitized
	);
}

/**
 * Clones the private documentation template repository to temporary storage
 *
 * This function performs an authenticated shallow clone of the private Next.js
 * documentation template repository from the specified branch. The shallow clone
 * (depth=1) optimization significantly reduces download time and bandwidth usage
 * by fetching only the latest commit without the full git history.
 *
 * If the requested branch doesn't exist in the template repository, it automatically
 * falls back to the default branch (main).
 *
 * @param authenticationToken - Valid GitHub personal access token with repository read permissions
 * @param buildMode - Current build mode for error context
 * @param branch - Git branch to clone from the repository
 *
 * @throws {FetchScriptError} When git clone operation fails (except branch-not-found, which triggers fallback)
 * @throws {FetchScriptError} When authentication fails due to invalid token
 * @throws {FetchScriptError} When network connectivity issues prevent cloning
 *
 * @example
 * ```typescript
 * const token = validateGitHubToken('development', 'main');
 * cloneDocumentationRepository(token, 'development', 'main');
 * // Repository now available at /tmp/new-docs from main branch
 *
 * cloneDocumentationRepository(token, 'development', 'canary');
 * // If canary doesn't exist, falls back to main branch
 * ```
 *
 * @see {@link https://git-scm.com/docs/git-clone | Git Clone Documentation}
 * @see {@link https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository | GitHub Repository Cloning}
 *
 * @internal This function handles sensitive authentication tokens
 */
function cloneDocumentationRepository(
	authenticationToken: GitHubToken,
	buildMode: BuildMode,
	branch: GitBranch
): void {
	const repoUrl = 'https://github.com/consentdotio/monorepo.git';
	const basicAuth = Buffer.from(
		`x-access-token:${authenticationToken}`
	).toString('base64');

	// Clean up any existing temporary directory from failed previous runs
	cleanupDirectory(
		FETCH_CONFIG.TEMP_DOCS_DIR,
		'temporary docs directory',
		buildMode,
		branch
	);

	// Try to clone the requested branch
	const cloneCommand = `git -c http.extraheader="Authorization: Basic ${basicAuth}" clone --depth=1 --branch=${branch} "${repoUrl}" ${FETCH_CONFIG.TEMP_DOCS_DIR}`;
	const branchExists = tryCloneBranch(cloneCommand, buildMode, branch, [
		authenticationToken,
		basicAuth,
	]);

	if (branchExists) {
		log(`✅ Fetched private Next.js documentation template (${branch} branch)`);
		return;
	}

	// Branch doesn't exist, fallback to default branch
	if (branch !== FETCH_CONFIG.DEFAULT_BRANCH) {
		log(
			`⚠️  Branch '${branch}' not found in template repo, falling back to '${FETCH_CONFIG.DEFAULT_BRANCH}'`
		);
		// Clean up failed attempt
		cleanupDirectory(
			FETCH_CONFIG.TEMP_DOCS_DIR,
			'temporary docs directory',
			buildMode,
			FETCH_CONFIG.DEFAULT_BRANCH
		);
		// Retry with default branch
		const fallbackCommand = `git -c http.extraheader="Authorization: Basic ${basicAuth}" clone --depth=1 --branch=${FETCH_CONFIG.DEFAULT_BRANCH} "${repoUrl}" ${FETCH_CONFIG.TEMP_DOCS_DIR}`;
		const fallbackSucceeded = tryCloneBranch(
			fallbackCommand,
			buildMode,
			FETCH_CONFIG.DEFAULT_BRANCH,
			[authenticationToken, basicAuth]
		);

		if (!fallbackSucceeded) {
			throw new FetchScriptError(
				`Failed to clone documentation template: neither '${branch}' nor '${FETCH_CONFIG.DEFAULT_BRANCH}' branch exists`,
				'clone_template',
				buildMode,
				branch
			);
		}

		log(
			`✅ Fetched private Next.js documentation template (${FETCH_CONFIG.DEFAULT_BRANCH} branch, fallback)`
		);
	} else {
		throw new FetchScriptError(
			`Failed to clone documentation template: default branch '${FETCH_CONFIG.DEFAULT_BRANCH}' not found`,
			'clone_template',
			buildMode,
			branch
		);
	}

	// Note: For reproducible builds across environments, consider pinning to specific commit:
	// executeCommand(
	//   `git -C ${FETCH_CONFIG.TEMP_DOCS_DIR} checkout <commit-sha>`,
	//   'Pinning to specific commit for reproducible builds',
	//   buildMode,
	//   branch
	// );
}

/**
 * Installs the fetched documentation template into the workspace
 *
 * This function performs a complete synchronization of the cloned documentation
 * template into the workspace's .docs directory. The rsync operation with
 * --delete flag ensures a pristine copy by removing any files that exist in
 * the destination but not in the source.
 *
 * After installation, it creates symbolic links to connect the documentation
 * app to the main repository's content directories, enabling hot module reloading
 * without content duplication.
 *
 * @param buildMode - Current build mode for error context
 * @param branch - Current branch for error context
 *
 * @throws {FetchScriptError} When rsync operation fails
 * @throws {FetchScriptError} When source directory is missing or inaccessible
 * @throws {FetchScriptError} When destination directory cannot be created or written
 * @throws {FetchScriptError} When symbolic link creation fails
 *
 * @example
 * ```typescript
 * // After successful template clone
 * cloneDocumentationRepository(token, 'development', 'main');
 * installDocumentationTemplate('development', 'main');
 * // Template now available at ./.docs/ with symlinks to ../docs and ../packages
 * ```
 *
 * @see {@link https://rsync.samba.org/documentation.html | Rsync Documentation}
 */
function installDocumentationTemplate(
	buildMode: BuildMode,
	branch: GitBranch
): void {
	// Remove existing docs app directory to ensure clean state
	cleanupDirectory(
		FETCH_CONFIG.DOCS_APP_DIR,
		'existing docs app directory',
		buildMode,
		branch
	);

	executeCommand(
		'true',
		'Installing documentation template into workspace',
		buildMode,
		branch,
		{ silent: true }
	);
	try {
		log('Installing documentation template into workspace...');
		// Docs are located at docs/c15t subdirectory in the monorepo
		const templateSourceDir = join(FETCH_CONFIG.TEMP_DOCS_DIR, 'docs', 'c15t');
		if (!existsSync(templateSourceDir)) {
			throw new FetchScriptError(
				`Template directory not found at ${templateSourceDir}. Ensure docs/c15t exists in the repository.`,
				'install_template',
				buildMode,
				branch
			);
		}

		// Debug: List contents of source directory
		log(`📂 Source directory: ${templateSourceDir}`);
		if (existsSync(templateSourceDir)) {
			const sourceContents = readdirSync(templateSourceDir, {
				withFileTypes: true,
			});
			log(`📋 Source directory contents (${sourceContents.length} items):`);
			for (const item of sourceContents.slice(0, 20)) {
				log(`   ${item.isDirectory() ? '📁' : '📄'} ${item.name}`);
			}
			if (sourceContents.length > 20) {
				log(`   ... and ${sourceContents.length - 20} more items`);
			}
		}

		cpSync(templateSourceDir, FETCH_CONFIG.DOCS_APP_DIR, {
			recursive: true,
		});

		// Debug: List contents of destination directory
		log(`📂 Destination directory: ${FETCH_CONFIG.DOCS_APP_DIR}`);
		if (existsSync(FETCH_CONFIG.DOCS_APP_DIR)) {
			const destContents = readdirSync(FETCH_CONFIG.DOCS_APP_DIR, {
				withFileTypes: true,
			});
			log(`📋 Destination directory contents (${destContents.length} items):`);
			for (const item of destContents.slice(0, 20)) {
				log(`   ${item.isDirectory() ? '📁' : '📄'} ${item.name}`);
			}
			if (destContents.length > 20) {
				log(`   ... and ${destContents.length - 20} more items`);
			}
		}

		cleanupDocsTemplates(buildMode, branch);
		patchC15tDocsTemplatePackageJson(buildMode, branch);
		patchVercelJson(buildMode, branch);
		log('✅ Installation completed successfully');
	} catch (error) {
		if (error instanceof FetchScriptError) {
			throw error;
		}
		throw new FetchScriptError(
			`Failed to copy template from ${join(FETCH_CONFIG.TEMP_DOCS_DIR, 'docs', 'c15t')} to ${FETCH_CONFIG.DOCS_APP_DIR}`,
			'install_template',
			buildMode,
			branch
		);
	}
}

type PackageJson = {
	readonly name?: string;
	readonly scripts?: Record<string, string>;
	readonly packageManager?: string;
};

function ensureDirExists(dirPath: string): void {
	if (existsSync(dirPath)) {
		return;
	}
	try {
		execSync(`mkdir -p "${dirPath}"`, { stdio: 'ignore' });
	} catch {
		// ignore
	}
}

function patchC15tDocsTemplatePackageJson(
	buildMode: BuildMode,
	branch: GitBranch
): void {
	// In the new monorepo structure, package.json is directly in .docs (not in templates/c15t)
	const templatePackageJsonPath = join(
		FETCH_CONFIG.DOCS_APP_DIR,
		'package.json'
	);

	if (!existsSync(templatePackageJsonPath)) {
		throw new FetchScriptError(
			`Template package.json not found at ${templatePackageJsonPath}`,
			'patch_template_package_json',
			buildMode,
			branch
		);
	}

	let parsed: PackageJson;
	try {
		const raw = readFileSync(templatePackageJsonPath, 'utf8');
		parsed = JSON.parse(raw) as PackageJson;
	} catch {
		throw new FetchScriptError(
			`Failed to read/parse template package.json at ${templatePackageJsonPath}`,
			'patch_template_package_json',
			buildMode,
			branch
		);
	}

	const existingScripts = parsed.scripts ?? {};
	const scripts: Record<string, string> = { ...existingScripts };

	// Ensure fumadocs-mdx can import workspace TS sources by running it under tsx,
	// but avoid executing the pnpm .bin shim (often a shell script).
	const internalDir = join(FETCH_CONFIG.DOCS_APP_DIR, 'scripts', 'internal');
	ensureDirExists(internalDir);
	const runnerPath = join(internalDir, 'run-fumadocs-mdx.ts');
	const runnerSource = `import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type Pkg = { bin?: string | Record<string, string> };

function resolveBinPath(cwd: string): string {
	const pkgJsonPath = path.join(cwd, 'node_modules', 'fumadocs-mdx', 'package.json');
	if (!existsSync(pkgJsonPath)) {
		throw new Error(\`fumadocs-mdx package.json not found at \${pkgJsonPath}\`);
	}
	const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as Pkg;
	const rel =
		typeof pkg.bin === 'string'
			? pkg.bin
			: typeof pkg.bin === 'object' && pkg.bin
				? (pkg.bin['fumadocs-mdx'] ?? '')
				: '';
	if (!rel) {
		throw new Error('fumadocs-mdx bin entry not found in package.json');
	}
	return path.resolve(path.dirname(pkgJsonPath), rel);
}

const cwd = process.cwd();
const binPath = resolveBinPath(cwd);
const args = process.argv.slice(2);
const result = spawnSync('tsx', [binPath, ...args], { stdio: 'inherit' });
if (result.error) {
	throw result.error;
}
process.exit(typeof result.status === 'number' ? result.status : 1);
`;

	try {
		if (!existsSync(runnerPath)) {
			writeFileSync(runnerPath, runnerSource, 'utf8');
		}
	} catch {
		throw new FetchScriptError(
			`Failed to write fumadocs-mdx runner at ${runnerPath}`,
			'patch_template_package_json',
			buildMode,
			branch
		);
	}

	scripts['fumadocs-mdx'] = 'tsx scripts/internal/run-fumadocs-mdx.ts';

	if (scripts.postinstall?.includes('fumadocs-mdx')) {
		scripts.postinstall = 'pnpm fumadocs-mdx';
	}
	if (scripts['types:check']?.includes('fumadocs-mdx')) {
		scripts['types:check'] = scripts['types:check'].replace(
			'fumadocs-mdx',
			'pnpm fumadocs-mdx'
		);
	}

	// Remove packageManager field to prevent Vercel from trying to download pnpm via Corepack
	// Vercel already has pnpm available and will use it via the installCommand in vercel.json
	const updated = {
		...parsed,
		scripts,
	};
	// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
	delete (updated as Record<string, unknown>).packageManager;

	try {
		writeFileSync(
			templatePackageJsonPath,
			`${JSON.stringify(updated, null, 2)}\n`,
			'utf8'
		);
	} catch {
		throw new FetchScriptError(
			`Failed to write template package.json at ${templatePackageJsonPath}`,
			'patch_template_package_json',
			buildMode,
			branch
		);
	}
}

/**
 * Patches vercel.json to use standalone install command instead of monorepo filter
 *
 * The monorepo's vercel.json uses `cd ../.. && pnpm install --filter c15t-docs` which
 * tries to install from the monorepo root, causing memory issues. Since .docs is now
 * a standalone app, it should just install its own dependencies.
 *
 * @param buildMode - Current build mode for error context
 * @param branch - Current branch for error context
 *
 * @throws {FetchScriptError} When vercel.json cannot be read or written
 */
function patchVercelJson(buildMode: BuildMode, branch: GitBranch): void {
	const vercelJsonPath = join(FETCH_CONFIG.DOCS_APP_DIR, 'vercel.json');

	// If vercel.json doesn't exist, that's okay - Vercel will auto-detect
	if (!existsSync(vercelJsonPath)) {
		return;
	}

	let vercelConfig: {
		installCommand?: string;
		buildCommand?: string;
		[key: string]: unknown;
	};

	try {
		const raw = readFileSync(vercelJsonPath, 'utf8');
		vercelConfig = JSON.parse(raw) as typeof vercelConfig;
	} catch {
		throw new FetchScriptError(
			`Failed to read/parse vercel.json at ${vercelJsonPath}`,
			'patch_vercel_json',
			buildMode,
			branch
		);
	}

	// Update installCommand to install only in current directory
	// Remove the monorepo-specific command that causes memory issues
	const updatedConfig = {
		...vercelConfig,
		installCommand: 'pnpm install --frozen-lockfile',
	};

	try {
		writeFileSync(
			vercelJsonPath,
			`${JSON.stringify(updatedConfig, null, 2)}\n`,
			'utf8'
		);
		log('✅ Updated vercel.json installCommand for standalone deployment');
	} catch {
		throw new FetchScriptError(
			`Failed to write vercel.json at ${vercelJsonPath}`,
			'patch_vercel_json',
			buildMode,
			branch
		);
	}
}

function cleanupDocsTemplates(buildMode: BuildMode, branch: GitBranch): void {
	const templatesDir = join(FETCH_CONFIG.DOCS_APP_DIR, 'templates');
	if (!existsSync(templatesDir)) {
		return;
	}
	try {
		const entries = readdirSync(templatesDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}
			if (entry.name === 'c15t') {
				continue;
			}
			const templatePath = join(templatesDir, entry.name);
			log(`🧹 Removing unwanted docs template: ${entry.name}`);
			rmSync(templatePath, { recursive: true, force: true });
		}
	} catch {
		throw new FetchScriptError(
			`Failed to clean templates directory at ${templatesDir}`,
			'cleanup_templates',
			buildMode,
			branch
		);
	}
}

function pullTemplateContent(buildMode: BuildMode, branch: GitBranch): void {
	// In the new monorepo structure, the template is directly in .docs (not in templates/c15t)
	const templateDir = FETCH_CONFIG.DOCS_APP_DIR;
	if (!existsSync(templateDir)) {
		throw new FetchScriptError(
			`Template directory not found at ${templateDir}`,
			'pull_content',
			buildMode,
			branch
		);
	}
	if (buildMode === 'production') {
		let repoFlag = '';
		const envRepo = process.env.C15T_DOCS_SOURCE_REPO || '';
		if (envRepo) {
			repoFlag = ` --repo="${envRepo}"`;
		}
		executeCommand(
			`cd ${templateDir} && pnpm tsx scripts/content/pull.ts --vercel --branch="${branch}"${repoFlag}`,
			'Pulling docs content into .docs/.c15t',
			buildMode,
			branch
		);
		return;
	}
	let repoFlag = '';
	const envRepo = process.env.C15T_DOCS_SOURCE_REPO || '';
	if (envRepo) {
		repoFlag = ` --repo="${envRepo}"`;
	}
	executeCommand(
		`cd ${templateDir} && pnpm tsx scripts/content/pull.ts --branch="${branch}"${repoFlag}`,
		'Pulling docs content into .docs/.c15t',
		buildMode,
		branch
	);
}

/**
 * Processes MDX content using fumadocs-mdx after dependencies are installed
 *
 * This function runs the fumadocs-mdx command to process all linked MDX content
 * and generate the necessary metadata for the documentation system. It must be
 * called after dependencies are installed since fumadocs-mdx needs to be available
 * in node_modules.
 *
 * @param buildMode - Current build mode for error context
 * @param branch - Current branch for error context
 *
 * @throws {FetchScriptError} When fumadocs-mdx processing fails
 * @throws {FetchScriptError} When fumadocs-mdx is not installed
 *
 * @example
 * ```typescript
 * // After dependencies are installed
 * installDocsAppDependencies('development', 'main');
 * processMDXContent('development', 'main');
 * // All MDX content processed and indexed
 * ```
 *
 * @see {@link https://fumadocs.vercel.app/docs/mdx | Fumadocs MDX Documentation}
 */
function processMDXContent(buildMode: BuildMode, branch: GitBranch): void {
	// In the new monorepo structure, the template is directly in .docs (not in templates/c15t)
	const templateDir = FETCH_CONFIG.DOCS_APP_DIR;
	executeCommand(
		`cd ${templateDir} && pnpm copy-content`,
		'Copying MDX content with copy-content',
		buildMode,
		branch
	);
	executeCommand(
		`cd ${templateDir} && pnpm exec fumadocs-mdx`,
		'Processing MDX content with fumadocs-mdx',
		buildMode,
		branch
	);
}

/**
 * Installs documentation application dependencies in complete isolation
 *
 * This function establishes the .docs dependency environment in complete
 * isolation from the main workspace. The --ignore-workspace flag prevents
 * pnpm from treating .docs as part of the workspace monorepo, while
 * --frozen-lockfile ensures reproducible dependency installation.
 *
 * @param buildMode - Current build mode for error context
 * @param branch - Current branch for error context
 *
 * @throws {FetchScriptError} When .docs dependencies cannot be installed
 * @throws {FetchScriptError} When .docs package.json is missing or invalid
 * @throws {FetchScriptError} When lockfile conflicts prevent installation
 *
 * @example
 * ```typescript
 * installDocsAppDependencies('development', 'canary');
 * // .docs/node_modules now contains isolated dependencies
 * ```
 *
 * @see {@link https://pnpm.io/cli/install | PNPM Install Documentation}
 * @see {@link https://pnpm.io/workspaces | PNPM Workspace Documentation}
 */
function installDocsAppDependencies(
	buildMode: BuildMode,
	branch: GitBranch
): void {
	executeCommand(
		`cd ${FETCH_CONFIG.DOCS_APP_DIR} && pnpm install --frozen-lockfile`,
		'Installing .docs workspace dependencies',
		buildMode,
		branch
	);
}

/**
 * Builds the documentation application for production deployment (production mode only)
 *
 * This function executes the final production build process for the documentation
 * application using Next.js build optimization. This step is only executed in
 * production mode as development workflows use the dev server instead.
 *
 * @param buildMode - Current build mode for error context
 * @param branch - Current branch for error context
 *
 * @throws {FetchScriptError} When Next.js build process fails
 * @throws {FetchScriptError} When build artifacts cannot be generated
 * @throws {FetchScriptError} When TypeScript compilation errors occur
 *
 * @example
 * ```typescript
 * // Only in production mode
 * buildDocsApplication('production', 'main');
 * // Production build available at .docs/.next/
 * ```
 *
 * @see {@link https://nextjs.org/docs/app/building-your-application/deploying | Next.js Deployment Documentation}
 * @see {@link https://vercel.com/docs/deployments/build-step | Vercel Build Process}
 */
// Note: Build step removed; Vercel will execute `vercel build` during CI.

/**
 * Orchestrates the complete fetch pipeline execution
 *
 * This function serves as the main entry point and coordinator for the entire
 * fetch process. It executes fetch phases based on the specified mode and branch
 * while providing comprehensive error handling and progress reporting.
 *
 * **Development Mode Pipeline:**
 * 1. **Authentication**: Load token from .env file
 * 2. **Template Acquisition**: Clone latest documentation template from specified branch
 * 3. **Workspace Integration**: Sync template to .docs and create content symlinks
 * 4. **Dependency Setup**: Install .docs dependencies
 * 5. **Content Processing**: Run fumadocs-mdx to process linked MDX content
 *
 * **Production Mode Pipeline:**
 * 1. **Authentication**: Validate environment token
 * 2. **Template Acquisition**: Clone latest documentation template from specified branch
 * 3. **Workspace Integration**: Sync template to .docs and create content symlinks
 * 4. Skips installations and content processing (handled by Vercel build)
 * 5. **Build handled by Vercel**
 *
 * @param fetchOptions - Parsed command line options determining build mode and branch
 *
 * @throws {ProcessExitError} When any fetch phase fails, causing process termination
 * @throws {FetchScriptError} When specific fetch operations encounter errors
 *
 * @example
 * ```typescript
 * // Development mode with main branch
 * const options = { isProduction: false, mode: 'development', branch: 'main' };
 * main(options); // Ready for pnpm dev
 *
 * // Production mode with canary branch
 * const options = { isProduction: true, mode: 'production', branch: 'canary' };
 * main(options); // Ready for Vercel deployment
 * ```
 *
 * @see {@link https://vercel.com/docs/deployments/build-step | Vercel Build Step Documentation}
 */
function main(fetchOptions: FetchOptions): void {
	let modeEmoji: string;
	let modeText: string;
	if (fetchOptions.isProduction) {
		modeEmoji = '🚀';
		modeText = 'production build';
	} else {
		modeEmoji = '⚡';
		modeText = 'development setup';
	}

	const pullSource = resolvePullSource(fetchOptions);
	process.env.C15T_DOCS_SOURCE_REPO = pullSource.repo || '';

	log(`${modeEmoji} Starting ${modeText} for documentation site...\n`);
	log(`📋 Template branch: ${fetchOptions.branch}`);
	if (pullSource.kind === 'github-pr') {
		log(`📋 Content source: PR head (${pullSource.branch})`);
		if (pullSource.repo) {
			log(`📋 Content repo: ${pullSource.repo}`);
		}
	} else if (pullSource.kind === 'explicit-branch') {
		log(`📋 Content source: explicit --branch (${pullSource.branch})`);
	} else {
		log(`📋 Content source: default (${pullSource.branch})`);
	}

	if (fetchOptions.dryRun) {
		log(
			'\n🧪 Dry run: exiting before authentication, cloning, installs, or builds.'
		);
		return;
	}

	try {
		// Phase 1: Validate authentication credentials
		const githubAuthenticationToken = validateGitHubToken(
			fetchOptions.mode,
			fetchOptions.branch
		);

		// Phase 1.5: Ensure pnpm is available before any package manager operations
		ensurePnpmAvailable(fetchOptions.mode, fetchOptions.branch);

		// Phase 2: Acquire latest documentation template from specified branch
		cloneDocumentationRepository(
			githubAuthenticationToken,
			fetchOptions.mode,
			fetchOptions.branch
		);

		// Phase 3: Integrate template into workspace
		installDocumentationTemplate(fetchOptions.mode, fetchOptions.branch);

		// Phase 4: Install workspace deps so the template can execute its scripts
		installDocsAppDependencies(fetchOptions.mode, fetchOptions.branch);

		// Phase 5: Pull content into .docs/.c15t (required for build)
		pullTemplateContent(fetchOptions.mode, pullSource.branch);

		// Development: Process MDX for local dev (production build can rely on Vercel build)
		if (!fetchOptions.isProduction) {
			processMDXContent(fetchOptions.mode, fetchOptions.branch);
		}

		// Phase 5: Skip building here; Vercel will run the build
		if (fetchOptions.isProduction) {
			log('🛑 Skipping local build in production mode; Vercel will build.');
		}

		// Success messaging based on mode
		log(`\n🎉 ${modeText} completed successfully!`);
		log(`📋 Template branch: ${fetchOptions.branch}`);
		log(`📋 Content branch: ${pullSource.branch}`);
		if (pullSource.repo) {
			log(`📋 Content repo: ${pullSource.repo}`);
		}

		if (fetchOptions.isProduction) {
			log('📦 Documentation site prepared; Vercel will perform the build.');
		} else {
			log('📂 Ready for local development!');
			log('🚀 Run "cd .docs && pnpm dev" to start the development server');
		}
	} catch (fetchError) {
		error(`\n💥 ${modeText} failed:`, fetchError);

		if (fetchError instanceof FetchScriptError) {
			error(`Fetch step: ${fetchError.step}`);
			error(`Build mode: ${fetchError.mode}`);
			error(`Branch: ${fetchError.branch}`);
			if (fetchError.command) {
				error(`Failed command: ${fetchError.command}`);
			}
		}

		exit(1);
	}
}

// Execute the main function if this script is run directly
if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
	const fetchOptions = parseFetchOptions();
	main(fetchOptions);
}
