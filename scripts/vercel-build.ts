#!/usr/bin/env tsx

/**
 * Simplified Vercel Build Script
 *
 * This script builds the documentation site directly from the monorepo structure.
 * It handles the complete build pipeline for Vercel deployments:
 * 1. Clones the monorepo (if needed)
 * 2. Ensures all required build files exist
 * 3. Sets up workspace in the cloned monorepo
 * 4. Copies docs app and dependencies to .docs directory
 * 5. Builds from docs/c15t directory
 * 6. Outputs to .docs/.next for Vercel
 *
 * @see {@link https://vercel.com/docs/deployments/build-step | Vercel Build Step Documentation}
 */

import { execSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Configuration constants for the build process
 */
const MONOREPO_URL = 'https://github.com/consentdotio/monorepo.git';
const TEMP_MONOREPO_DIR = join(tmpdir(), 'c15t-monorepo-build');
const DOCS_DIR = '.docs';
const DOCS_SOURCE_DIR = join(TEMP_MONOREPO_DIR, 'docs', 'c15t');

/**
 * Package path mapping for copying workspace dependencies
 */
type PackageMapping = {
	readonly source: string;
	readonly dest: string;
};

/**
 * Vercel configuration structure
 */
type VercelConfig = {
	installCommand?: string;
	packageManager?: string;
	[key: string]: unknown;
};

/**
 * Retrieves GitHub authentication token from environment variables
 *
 * @returns The authentication token string
 *
 * @throws {Error} When neither CONSENT_GIT_TOKEN nor GITHUB_TOKEN is set
 *
 * @example
 * ```ts
 * const token = getGitHubToken();
 * ```
 */
function getGitHubToken(): string {
	const token = process.env.CONSENT_GIT_TOKEN || process.env.GITHUB_TOKEN;
	if (!token) {
		throw new Error(
			'CONSENT_GIT_TOKEN or GITHUB_TOKEN environment variable is required'
		);
	}
	return token;
}

/**
 * Clones the monorepo repository to a temporary directory
 *
 * Attempts to clone the specified branch, falling back to 'main' if the branch
 * doesn't exist. Uses GitHub token authentication for private repository access.
 *
 * @param branch - Git branch name to clone (defaults to 'main')
 *
 * @throws {Error} When git clone fails and fallback to main also fails
 *
 * @example
 * ```ts
 * cloneMonorepo('canary');
 * ```
 */
function cloneMonorepo(branch = 'main'): void {
	console.log(`📦 Cloning monorepo (branch: ${branch})...`);

	const token = getGitHubToken();
	const basicAuth = Buffer.from(`x-access-token:${token}`).toString('base64');

	// Clean up existing clone
	if (existsSync(TEMP_MONOREPO_DIR)) {
		execSync(`rm -rf "${TEMP_MONOREPO_DIR}"`, { stdio: 'inherit' });
	}

	// Clone with authentication
	const cloneCommand = `git -c http.extraheader="Authorization: Basic ${basicAuth}" clone --depth=1 --branch=${branch} "${MONOREPO_URL}" "${TEMP_MONOREPO_DIR}"`;

	try {
		execSync(cloneCommand, { stdio: 'inherit' });
		console.log('✅ Monorepo cloned successfully');
	} catch (error) {
		// Try main branch if specified branch doesn't exist
		if (branch !== 'main') {
			console.log(`⚠️  Branch '${branch}' not found, trying 'main'...`);
			const fallbackCommand = `git -c http.extraheader="Authorization: Basic ${basicAuth}" clone --depth=1 --branch=main "${MONOREPO_URL}" "${TEMP_MONOREPO_DIR}"`;
			execSync(fallbackCommand, { stdio: 'inherit' });
			console.log('✅ Monorepo cloned successfully (fallback to main)');
		} else {
			throw error;
		}
	}
}

/**
 * Ensures the build/mdx-to-md.ts file exists in the cloned monorepo
 *
 * This file is required for the build pipeline but may not be tracked in git.
 * Attempts to read from local workspace paths first, then creates it if missing.
 *
 * @throws {Error} When file creation fails (non-fatal, logged as warning)
 *
 * @example
 * ```ts
 * ensureBuildFileExists();
 * ```
 */
function ensureBuildFileExists(): void {
	const buildFile = join(
		TEMP_MONOREPO_DIR,
		'pkgs',
		'optin',
		'docs',
		'src',
		'scripts',
		'build',
		'mdx-to-md.ts'
	);
	const buildDir = join(
		TEMP_MONOREPO_DIR,
		'pkgs',
		'optin',
		'docs',
		'src',
		'scripts',
		'build'
	);

	if (!existsSync(buildFile)) {
		console.log('📦 Creating missing build/mdx-to-md.ts file...');

		if (!existsSync(buildDir)) {
			mkdirSync(buildDir, { recursive: true });
		}

		// Read from local workspace if available
		const localPaths = [
			'/Users/christopherburns/glados/c/consent-monorepo/pkgs/optin/docs/src/scripts/build/mdx-to-md.ts',
			join(
				process.cwd(),
				'../../consent-monorepo/pkgs/optin/docs/src/scripts/build/mdx-to-md.ts'
			),
		];

		let content: string | null = null;
		for (const path of localPaths) {
			if (existsSync(path)) {
				try {
					content = readFileSync(path, 'utf8');
					console.log(`✅ Read mdx-to-md.ts from ${path}`);
					break;
				} catch {
					// Continue to next path
				}
			}
		}

		// If not found locally, log warning and continue
		// The build will fail with a clear error if the file is truly missing
		if (!content) {
			console.log(
				'⚠️  mdx-to-md.ts not found - build may fail. File should be committed to git.'
			);
			return;
		}

		writeFileSync(buildFile, content, 'utf8');
		console.log('✅ Created build/mdx-to-md.ts');
	}
}

/**
 * Sets up the .docs directory structure for building
 *
 * Copies the docs app and required workspace packages from the cloned monorepo,
 * creates pnpm workspace configuration, and ensures all necessary files are present.
 *
 * @throws {Error} When file operations fail
 *
 * @example
 * ```ts
 * setupDocsDirectory();
 * ```
 */
function setupDocsDirectory(): void {
	console.log('📂 Setting up .docs directory...');

	// Copy docs app to .docs
	if (existsSync(DOCS_DIR)) {
		execSync(`rm -rf "${DOCS_DIR}"`, { stdio: 'inherit' });
	}

	cpSync(DOCS_SOURCE_DIR, DOCS_DIR, { recursive: true });
	console.log('✅ Copied docs app to .docs');

	// Copy required workspace packages
	const packagesToCopy: readonly PackageMapping[] = [
		{ source: 'pkgs/icon-scanner', dest: 'pkgs/icon-scanner' },
		{ source: 'pkgs/typescript-config', dest: 'pkgs/typescript-config' },
		{ source: 'pkgs/optin/og', dest: 'pkgs/optin/og' },
		{ source: 'pkgs/optin/components', dest: 'pkgs/optin/components' },
		{ source: 'pkgs/optin/docs', dest: 'pkgs/optin/docs' },
		{ source: 'pkgs/optin/flags', dest: 'pkgs/optin/flags' },
		{ source: 'pkgs/optin/icons', dest: 'pkgs/optin/icons' },
	] as const;

	for (const { source, dest } of packagesToCopy) {
		const sourcePath = join(TEMP_MONOREPO_DIR, source);
		const destPath = join(DOCS_DIR, dest);

		if (existsSync(sourcePath)) {
			mkdirSync(join(destPath, '..'), { recursive: true });
			cpSync(sourcePath, destPath, { recursive: true });
			console.log(`   ✅ Copied ${source}`);
		}
	}

	// Create pnpm-workspace.yaml
	const workspaceConfig = `packages:
  - "pkgs/**"
  - "."
`;
	writeFileSync(join(DOCS_DIR, 'pnpm-workspace.yaml'), workspaceConfig, 'utf8');

	// Copy catalog from monorepo if it exists
	const monorepoWorkspacePath = join(TEMP_MONOREPO_DIR, 'pnpm-workspace.yaml');
	if (existsSync(monorepoWorkspacePath)) {
		const monorepoWorkspace = readFileSync(monorepoWorkspacePath, 'utf8');
		const catalogMatch = monorepoWorkspace.match(
			/^catalog:\s*\n([\s\S]*?)(?=\n\w|\n$)/m
		);
		if (catalogMatch) {
			const workspaceWithCatalog = workspaceConfig + '\n' + catalogMatch[0];
			writeFileSync(
				join(DOCS_DIR, 'pnpm-workspace.yaml'),
				workspaceWithCatalog,
				'utf8'
			);
		}
	}

	// Ensure build file exists in copied packages
	const buildFile = join(
		DOCS_DIR,
		'pkgs',
		'optin',
		'docs',
		'src',
		'scripts',
		'build',
		'mdx-to-md.ts'
	);
	if (!existsSync(buildFile)) {
		const sourceBuildFile = join(
			TEMP_MONOREPO_DIR,
			'pkgs',
			'optin',
			'docs',
			'src',
			'scripts',
			'build',
			'mdx-to-md.ts'
		);
		if (existsSync(sourceBuildFile)) {
			mkdirSync(join(buildFile, '..'), { recursive: true });
			cpSync(sourceBuildFile, buildFile);
			console.log('✅ Copied build/mdx-to-md.ts to .docs');
		} else {
			console.log('⚠️  build/mdx-to-md.ts not found in source - build may fail');
		}
	}

	// Update vercel.json to use standalone install
	const vercelJsonPath = join(DOCS_DIR, 'vercel.json');
	if (existsSync(vercelJsonPath)) {
		const vercelConfig = JSON.parse(
			readFileSync(vercelJsonPath, 'utf8')
		) as VercelConfig;
		vercelConfig.installCommand = 'pnpm install';
		delete vercelConfig.packageManager;
		writeFileSync(
			vercelJsonPath,
			JSON.stringify(vercelConfig, null, 2) + '\n',
			'utf8'
		);
	}
}

/**
 * Determines the git branch to use for cloning
 *
 * Checks environment variables in order of precedence:
 * 1. VERCEL_GIT_COMMIT_REF (Vercel deployments)
 * 2. GITHUB_REF_NAME (GitHub Actions)
 * 3. Falls back to 'main'
 *
 * @returns The branch name to use
 *
 * @example
 * ```ts
 * const branch = determineBranch();
 * ```
 */
function determineBranch(): string {
	return (
		process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || 'main'
	);
}

/**
 * Checks if .docs directory is already set up and ready to build
 *
 * @returns True if .docs exists with package.json and appears complete
 */
function isDocsDirectoryReady(): boolean {
	const packageJsonPath = join(DOCS_DIR, 'package.json');
	return existsSync(DOCS_DIR) && existsSync(packageJsonPath);
}

/**
 * Main build orchestration function
 *
 * Executes the complete build pipeline:
 * 1. Checks if .docs already exists (from GitHub Actions setup)
 * 2. If not, clones monorepo and sets up .docs directory
 * 3. Ensures build files exist
 * 4. Installs dependencies
 * 5. Builds the documentation site
 *
 * @throws {Error} When any build step fails
 *
 * @example
 * ```ts
 * main();
 * ```
 */
function main(): void {
	console.log('🚀 Starting Vercel build process...');

	// Check if .docs is already set up (e.g., from GitHub Actions)
	if (isDocsDirectoryReady()) {
		console.log('📂 .docs directory already exists, skipping setup...');
	} else {
		const branch = determineBranch();
		console.log(`📋 Using branch: ${branch}`);

		// Step 1: Clone monorepo
		if (!existsSync(TEMP_MONOREPO_DIR) || !existsSync(DOCS_SOURCE_DIR)) {
			cloneMonorepo(branch);
		}

		// Step 2: Ensure build file exists in monorepo
		ensureBuildFileExists();

		// Step 3: Setup .docs directory
		setupDocsDirectory();
	}

	// Step 4: Ensure build file exists in .docs (in case it was missing)
	const buildFile = join(
		DOCS_DIR,
		'pkgs',
		'optin',
		'docs',
		'src',
		'scripts',
		'build',
		'mdx-to-md.ts'
	);
	if (!existsSync(buildFile)) {
		// If .docs was set up by GitHub Actions, we may need to clone monorepo to get the file
		if (!existsSync(TEMP_MONOREPO_DIR) || !existsSync(DOCS_SOURCE_DIR)) {
			const branch = determineBranch();
			console.log(
				`📋 Cloning monorepo to get missing build file (branch: ${branch})...`
			);
			cloneMonorepo(branch);
			ensureBuildFileExists();
		}

		const sourceBuildFile = join(
			TEMP_MONOREPO_DIR,
			'pkgs',
			'optin',
			'docs',
			'src',
			'scripts',
			'build',
			'mdx-to-md.ts'
		);
		if (existsSync(sourceBuildFile)) {
			mkdirSync(join(buildFile, '..'), { recursive: true });
			cpSync(sourceBuildFile, buildFile);
			console.log('✅ Ensured build/mdx-to-md.ts exists');
		} else {
			console.log('⚠️  build/mdx-to-md.ts not found - build may fail');
		}
	}

	// Step 5: Install dependencies and build
	console.log('📦 Installing dependencies...');
	process.chdir(DOCS_DIR);
	execSync('pnpm install', { stdio: 'inherit' });

	console.log('🔨 Building...');
	execSync('pnpm build', { stdio: 'inherit' });

	console.log('✅ Build complete!');
}

main();
