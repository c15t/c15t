import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

export const ROOT_DIR = resolve(import.meta.dir, '..', '..');
export const DOCS_DIR = join(ROOT_DIR, 'docs');
export const PACKAGES_DIR = join(ROOT_DIR, 'packages');

export type AgentPage = {
	sourcePath: string;
	outputPath: string;
	publicUrl: string;
	topicTags: string[];
};

type AgentPackageConfig = {
	packageName: string;
	packageDir: string;
	displayTitle: string;
	description: string;
	metaFile: string;
	frameworkRoot: string;
	includeIntegrations: boolean;
	workflowKeywords: string[];
	appliesWhen: string[];
	focusArea: string;
	startPages: string[];
	pageAliases?: Record<string, string>;
};

type MetaFile = {
	pages?: string[];
};

const SHARED_REACT_ALIASES: Record<string, string> = {
	concepts: join(DOCS_DIR, 'shared', 'concepts'),
	components: join(DOCS_DIR, 'shared', 'react', 'components'),
	styling: join(DOCS_DIR, 'shared', 'react', 'styling'),
	hooks: join(DOCS_DIR, 'shared', 'react', 'hooks'),
	iab: join(DOCS_DIR, 'shared', 'react', 'iab'),
};

export const AGENT_PACKAGE_CONFIGS: AgentPackageConfig[] = [
	{
		packageName: 'c15t',
		packageDir: join(PACKAGES_DIR, 'core'),
		displayTitle: 'c15t JavaScript',
		description:
			'Core c15t JavaScript docs for consent management, script loading, callbacks, and integrations.',
		metaFile: join(DOCS_DIR, 'frameworks', 'javascript', 'meta.json'),
		frameworkRoot: join(DOCS_DIR, 'frameworks', 'javascript'),
		includeIntegrations: true,
		workflowKeywords: [
			'consent management',
			'cookie banner',
			'script loader',
			'callbacks',
			'integrations',
			'policy packs',
		],
		appliesWhen: [
			'changing consent flows in a JavaScript app',
			'loading third-party scripts behind consent',
			'configuring callbacks or integrations',
		],
		focusArea: 'consent flows, script loading, or integrations',
		startPages: [
			'quickstart.md',
			'script-loader.md',
			'callbacks.md',
			'integrations/google-tag-manager.md',
		],
	},
	{
		packageName: '@c15t/react',
		packageDir: join(PACKAGES_DIR, 'react'),
		displayTitle: 'c15t React',
		description:
			'React-focused c15t docs for consent UI, hooks, headless flows, and script integrations.',
		metaFile: join(DOCS_DIR, 'frameworks', 'react', 'meta.json'),
		frameworkRoot: join(DOCS_DIR, 'frameworks', 'react'),
		includeIntegrations: true,
		workflowKeywords: [
			'consent management',
			'cookie banner',
			'consent dialog',
			'preference center',
			'script loading',
			'third-party scripts',
			'hooks',
			'headless consent UI',
			'Google Tag Manager',
			'analytics integrations',
		],
		appliesWhen: [
			'changing cookie banners, dialogs, or preference centers in a React app',
			'working on hooks, providers, or headless consent UI',
			'loading scripts or analytics behind consent',
		],
		focusArea: 'consent UI, script loading, or analytics integrations',
		startPages: [
			'quickstart.md',
			'headless.md',
			'building-headless-components.md',
			'callbacks.md',
			'integrations/google-tag-manager.md',
		],
		pageAliases: SHARED_REACT_ALIASES,
	},
	{
		packageName: '@c15t/nextjs',
		packageDir: join(PACKAGES_DIR, 'nextjs'),
		displayTitle: 'c15t Next.js',
		description:
			'Next.js-focused c15t docs for consent UI, server-side behavior, callbacks, and integrations.',
		metaFile: join(DOCS_DIR, 'frameworks', 'next', 'meta.json'),
		frameworkRoot: join(DOCS_DIR, 'frameworks', 'next'),
		includeIntegrations: true,
		workflowKeywords: [
			'consent management',
			'cookie banner',
			'preference center',
			'server-side consent behavior',
			'script loading',
			'callbacks',
			'middleware or app-router integration',
			'Google Tag Manager',
			'GA4',
			'PostHog',
		],
		appliesWhen: [
			'changing consent flows in a Next.js app',
			'working on server-side consent behavior or callbacks',
			'loading scripts or analytics behind consent',
		],
		focusArea: 'consent flows, script loading, or integrations',
		startPages: [
			'quickstart.md',
			'server-side.md',
			'callbacks.md',
			'script-loader.md',
			'integrations/google-tag-manager.md',
		],
		pageAliases: SHARED_REACT_ALIASES,
	},
	{
		packageName: '@c15t/backend',
		packageDir: join(PACKAGES_DIR, 'backend'),
		displayTitle: 'c15t Backend',
		description:
			'Self-hosted c15t backend docs for configuration, policy packs, APIs, and operational behavior.',
		metaFile: join(DOCS_DIR, 'self-host', 'meta.json'),
		frameworkRoot: join(DOCS_DIR, 'self-host'),
		includeIntegrations: false,
		workflowKeywords: [
			'self-hosted consent backend',
			'policy packs',
			'storage adapters',
			'audit logs',
			'config',
			'API behavior',
		],
		appliesWhen: [
			'changing self-hosted consent backend behavior',
			'working on backend configuration or APIs',
			'editing policy packs, storage, or observability setup',
		],
		focusArea: 'self-hosted consent backend behavior',
		startPages: [
			'quickstart.md',
			'guides/database-setup.md',
			'guides/policy-packs.md',
			'api/configuration.md',
		],
	},
];

export const PACKAGE_ORDER = AGENT_PACKAGE_CONFIGS.map(
	(config) => config.packageName
);

export function getAgentPackageConfig(packageName: string): AgentPackageConfig {
	const config = AGENT_PACKAGE_CONFIGS.find(
		(candidate) => candidate.packageName === packageName
	);
	if (!config) {
		throw new Error(`Unsupported agent docs package: ${packageName}`);
	}
	return config;
}

function readMeta(metaFile: string): MetaFile {
	return JSON.parse(readFileSync(metaFile, 'utf8')) as MetaFile;
}

function buildPublicUrl(config: AgentPackageConfig, entry: string): string {
	if (config.frameworkRoot.endsWith(join('docs', 'self-host'))) {
		const normalized = entry.replace(/^\.\//, '');
		if (normalized === 'quickstart') {
			return 'https://c15t.com/docs/self-host/quickstart';
		}
		return `https://c15t.com/docs/self-host/${normalized}`;
	}

	const frameworkSegment = relative(
		join(DOCS_DIR, 'frameworks'),
		config.frameworkRoot
	)
		.replace(/\\/g, '/')
		.split('/')[0];

	const normalized = entry.replace(/^\.\//, '');
	return `https://c15t.com/docs/frameworks/${frameworkSegment}/${normalized}`;
}

function resolveMetaEntry(
	config: AgentPackageConfig,
	entry: string
): {
	sourcePath: string;
	outputPath: string;
	publicUrl: string;
	topicTags: string[];
} {
	if (!entry.startsWith('./')) {
		const sourcePath = join(config.frameworkRoot, `${entry}.mdx`);
		return {
			sourcePath,
			outputPath: `${entry}.md`,
			publicUrl: buildPublicUrl(config, entry),
			topicTags: deriveTopicTags(entry, sourcePath),
		};
	}

	const normalized = entry.slice(2);
	const [prefix, ...rest] = normalized.split('/');
	const remainder = rest.join('/');
	const aliasRoot = config.pageAliases?.[prefix];
	const sourceDir = aliasRoot ?? join(config.frameworkRoot, prefix);
	const sourcePath = join(sourceDir, `${remainder}.mdx`);
	return {
		sourcePath,
		outputPath: `${normalized}.md`,
		publicUrl: buildPublicUrl(config, entry),
		topicTags: deriveTopicTags(normalized, sourcePath),
	};
}

function resolveIntegrationEntries(): string[] {
	const meta = readMeta(join(DOCS_DIR, 'integrations', 'meta.json'));
	return (meta.pages ?? []).filter(
		(entry) => entry.length > 0 && !entry.startsWith('---')
	);
}

export function resolvePackagePages(packageName: string) {
	const config = getAgentPackageConfig(packageName);
	const meta = readMeta(config.metaFile);
	const entries = (meta.pages ?? []).filter(
		(entry) => entry.length > 0 && !entry.startsWith('---')
	);

	const pages = entries.map((entry) => resolveMetaEntry(config, entry));

	if (config.includeIntegrations) {
		for (const entry of resolveIntegrationEntries()) {
			pages.push({
				sourcePath: join(DOCS_DIR, 'integrations', `${entry}.mdx`),
				outputPath: `integrations/${entry}.md`,
				publicUrl: `https://c15t.com/docs/integrations/${entry}`,
				topicTags: deriveTopicTags(
					`integrations/${entry}`,
					join(DOCS_DIR, 'integrations', `${entry}.mdx`)
				),
			});
		}
	}

	return pages;
}

export function getAgentDocsDir(packageName: string) {
	return join(getAgentPackageConfig(packageName).packageDir, 'dist', 'docs');
}

export function ensureCleanAgentDocsDir(packageName: string) {
	const docsDir = getAgentDocsDir(packageName);
	rmSync(docsDir, { recursive: true, force: true });
	mkdirSync(docsDir, { recursive: true });
}

export function ensureParentDir(filePath: string) {
	mkdirSync(dirname(filePath), { recursive: true });
}

export function writeText(filePath: string, content: string) {
	ensureParentDir(filePath);
	writeFileSync(filePath, content, 'utf8');
}

export function deriveTopicTags(entry: string, sourcePath: string): string[] {
	const tags = new Set<string>();
	const normalized = entry.replace(/\.mdx?$/, '').replace(/\\/g, '/');
	const baseName = normalized.split('/').at(-1) ?? normalized;

	for (const segment of normalized.split('/')) {
		if (segment.length > 0) {
			tags.add(segment);
		}
	}

	if (
		sourcePath.includes(
			`${join('docs', 'integrations')}${process.platform === 'win32' ? '\\' : '/'}`
		)
	) {
		tags.add('integrations');
	}

	if (baseName === 'google-tag-manager') {
		tags.add('gtm');
	}
	if (baseName === 'google-tag') {
		tags.add('ga4');
	}
	if (baseName === 'posthog') {
		tags.add('analytics');
	}
	if (baseName === 'meta-pixel') {
		tags.add('advertising');
	}

	if (normalized.startsWith('components/')) {
		tags.add('components');
	}
	if (normalized.startsWith('hooks/')) {
		tags.add('hooks');
	}
	if (normalized.startsWith('styling/')) {
		tags.add('styling');
	}
	if (normalized.startsWith('concepts/')) {
		tags.add('concepts');
	}
	if (normalized.startsWith('api/')) {
		tags.add('api');
	}
	if (normalized.startsWith('guides/')) {
		tags.add('guides');
	}

	return [...tags];
}

export function expectedAgentDocPaths(packageName: string) {
	return new Set(
		resolvePackagePages(packageName).map(
			(page) => `dist/docs/${page.outputPath}`
		)
	);
}

export function removeIfMissing(filePath: string) {
	if (!existsSync(filePath)) {
		throw new Error(`Expected file does not exist: ${filePath}`);
	}
}
