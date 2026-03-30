#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	checkPackedAgentDocs,
	supportedAgentDocsPackages,
} from './agent-docs/check-budgets';

type PackedFile = {
	path: string;
	size: number;
};

type PackResult = {
	name: string;
	version: string;
	files: PackedFile[];
};

type PackageManifest = {
	name?: string;
	private?: boolean;
};

const ROOT = process.cwd();
const PACKAGES_DIR = join(ROOT, 'packages');
const TABLE_HEADER = '|Property|Type|Description|Default|Required|';

const distBlockedPathPatterns: Array<{ reason: string; pattern: RegExp }> = [
	{ reason: 'test folder', pattern: /(^|\/)__tests__(\/|$)/ },
	{ reason: 'snapshot folder', pattern: /(^|\/)__snapshots__(\/|$)/ },
	{ reason: 'screenshot folder', pattern: /(^|\/)__screenshots__(\/|$)/ },
	{ reason: 'test file', pattern: /\.test\./ },
	{ reason: 'spec file', pattern: /\.spec\./ },
	{ reason: 'e2e file', pattern: /\.e2e\./ },
	{
		reason: 'msw mock service worker',
		pattern: /(^|\/)mockServiceWorker\.js$/,
	},
	{ reason: 'playwright screenshot output', pattern: /(^|\/)static\/image\// },
	{ reason: 'rsdoctor report artifact', pattern: /(^|\/)rsdoctor-data\.json$/ },
];

function readManifest(packageDir: string): PackageManifest {
	return JSON.parse(
		readFileSync(join(packageDir, 'package.json'), 'utf8')
	) as PackageManifest;
}

function runPack(packageDir: string): PackResult {
	const proc = Bun.spawnSync(['npm', 'pack', '--json', '--dry-run'], {
		cwd: packageDir,
		stdout: 'pipe',
		stderr: 'pipe',
	});

	if (proc.exitCode !== 0) {
		const stderr = new TextDecoder().decode(proc.stderr);
		const stdout = new TextDecoder().decode(proc.stdout);
		throw new Error(
			`npm pack failed in ${packageDir}\nstdout:\n${stdout}\nstderr:\n${stderr}`
		);
	}

	const stdout = new TextDecoder().decode(proc.stdout).trim();
	const jsonStart = stdout.indexOf('[\n  {');
	const jsonEnd = stdout.lastIndexOf('\n]');
	const jsonPayload =
		jsonStart >= 0 && jsonEnd >= jsonStart
			? stdout.slice(jsonStart, jsonEnd + 2)
			: stdout;
	const parsed = JSON.parse(jsonPayload) as PackResult[];
	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new Error(`Unexpected npm pack output in ${packageDir}: ${stdout}`);
	}

	const [firstPack] = parsed;
	if (!firstPack) {
		throw new Error(`Unexpected npm pack output in ${packageDir}: ${stdout}`);
	}

	return firstPack;
}

function getBlockedReason(path: string): string | null {
	// Most accidental publish bloat in this repo comes from built output.
	if (path.startsWith('dist/')) {
		for (const rule of distBlockedPathPatterns) {
			if (rule.pattern.test(path)) {
				return rule.reason;
			}
		}
	}

	// @c15t/ui intentionally publishes src/styles, so guard that surface too.
	if (path.startsWith('src/styles/')) {
		for (const rule of [
			{
				reason: 'test folder in published styles',
				pattern: /(^|\/)__tests__(\/|$)/,
			},
			{
				reason: 'test file in published styles',
				pattern: /\.test\./,
			},
		]) {
			if (rule.pattern.test(path)) {
				return rule.reason;
			}
		}
	}

	return null;
}

function collectMarkdownFiles(dir: string): string[] {
	if (!existsSync(dir)) {
		return [];
	}

	const result: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const entryPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			result.push(...collectMarkdownFiles(entryPath));
		} else if (entry.isFile() && entry.name.endsWith('.md')) {
			result.push(entryPath);
		}
	}
	return result;
}

function validateRelativeMarkdownLinks(
	content: string,
	rel: string,
	availableRelativePaths: Set<string>,
	issues: string[]
) {
	const linkPattern = /\[[^\]]+\]\((\.\/[^)]+)\)/g;
	for (const match of content.matchAll(linkPattern)) {
		const target = match[1]?.replace(/^\.\//, '');
		if (!target) {
			continue;
		}
		if (!availableRelativePaths.has(target)) {
			issues.push(`broken relative docs link in ${rel}: ${target}`);
		}
	}
}

function scanAgentDocsContent(packageDir: string): string[] {
	const issues: string[] = [];
	const docsDir = join(packageDir, 'docs');
	const markdownFiles = collectMarkdownFiles(docsDir);
	const availableRelativePaths = new Set(
		markdownFiles.map((filePath) =>
			filePath.slice(docsDir.length + 1).replaceAll('\\', '/')
		)
	);

	for (const filePath of markdownFiles) {
		const rel = filePath.slice(packageDir.length + 1).replaceAll('\\', '/');
		const content = readFileSync(filePath, 'utf8');
		const docsRel = rel.slice('docs/'.length);

		if (
			/\\\[[^\]]+\\\]\(:\/\//.test(content) ||
			/\\\[[^\]]+\\\]\(https?:\/\//.test(content)
		) {
			issues.push(`invalid escaped markdown link syntax in ${rel}`);
		}
		if (/\]\(<https?:\/\/[^)>]+\s-\s[^)>]+>\)/.test(content)) {
			issues.push(`invalid angle-bracket markdown link syntax in ${rel}`);
		}
		if (content.includes('&#xA;')) {
			issues.push(`escaped newline entity found in ${rel}`);
		}
		if (rel === 'docs/README.md') {
			if (!content.includes('## Start Here')) {
				issues.push('missing Start Here section in docs/README.md');
			}
			if (!content.includes('## Workflow Rules')) {
				issues.push('missing Workflow Rules section in docs/README.md');
			}
			if (content.includes('dist/docs/')) {
				issues.push('stale dist/docs reference found in docs/README.md');
			}
		}
		if (/^#### `[^`]+` \{.+$/m.test(content)) {
			issues.push(`oversized anonymous object heading found in ${rel}`);
		}
		if (
			/(?:^|\n)### Options\s*\n\s*\n### [A-Za-z0-9]+Options(?:\n|$)/.test(
				content
			)
		) {
			issues.push(`redundant options heading pair found in ${rel}`);
		}

		const lines = content.split('\n');
		let inPropertyTable = false;
		for (let index = 0; index < lines.length; index += 1) {
			if (lines[index] === TABLE_HEADER) {
				inPropertyTable = true;

				let previousNonEmpty = index - 1;
				while (
					previousNonEmpty >= 0 &&
					lines[previousNonEmpty]?.trim() === ''
				) {
					previousNonEmpty -= 1;
				}

				if (
					previousNonEmpty >= 0 &&
					lines[previousNonEmpty]?.startsWith('|') &&
					!lines[previousNonEmpty]?.startsWith('#### ')
				) {
					issues.push(
						`anonymous repeated table sequence in ${rel}:${index + 1}`
					);
					break;
				}

				continue;
			}

			if (!inPropertyTable) {
				continue;
			}

			if (lines[index].trim() === '') {
				inPropertyTable = false;
				continue;
			}

			const line = lines[index] ?? '';
			if (!line.startsWith('|') || !line.endsWith('|')) {
				continue;
			}
			const cells = line.slice(1, -1).split('|');
			if (cells[1] && cells[1].length > 140) {
				issues.push(`oversized type cell found in ${rel}`);
				break;
			}
		}

		validateRelativeMarkdownLinks(
			content,
			docsRel,
			availableRelativePaths,
			issues
		);
	}

	return issues;
}

const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => join(PACKAGES_DIR, entry.name))
	.filter((packageDir) => existsSync(join(packageDir, 'package.json')));

const offenders: Array<{
	packageName: string;
	version: string;
	files: Array<{ path: string; size: number; reason: string }>;
}> = [];
const agentDocOffenders: Array<{
	packageName: string;
	version: string;
	issues: string[];
}> = [];

let checkedPackages = 0;

for (const packageDir of packageDirs) {
	const manifest = readManifest(packageDir);
	if (manifest.private || !manifest.name) {
		continue;
	}

	const packed = runPack(packageDir);
	checkedPackages += 1;

	const blockedFiles = packed.files
		.map((file) => {
			const reason = getBlockedReason(file.path);
			if (!reason) return null;
			return { ...file, reason };
		})
		.filter((file) => file !== null);

	if (blockedFiles.length > 0) {
		offenders.push({
			packageName: packed.name,
			version: packed.version,
			files: blockedFiles,
		});
	}

	if (supportedAgentDocsPackages().includes(packed.name)) {
		const result = checkPackedAgentDocs(packed.name, packed.files);
		const contentIssues = scanAgentDocsContent(packageDir);
		const allIssues = [...result.issues, ...contentIssues];
		if (allIssues.length > 0) {
			agentDocOffenders.push({
				packageName: packed.name,
				version: packed.version,
				issues: allIssues,
			});
		}
	}
}

if (offenders.length === 0 && agentDocOffenders.length === 0) {
	console.log(
		`Publish artifact guard passed. Checked ${checkedPackages} packages.`
	);
	process.exit(0);
}

console.error('Publish artifact guard failed.');
for (const offender of offenders) {
	console.error(`\n- ${offender.packageName}@${offender.version}`);
	for (const file of offender.files) {
		console.error(`  - ${file.path} (${file.size} bytes) [${file.reason}]`);
	}
}

for (const offender of agentDocOffenders) {
	console.error(`\n- ${offender.packageName}@${offender.version}`);
	for (const issue of offender.issues) {
		console.error(`  - ${issue}`);
	}
}

process.exit(1);
