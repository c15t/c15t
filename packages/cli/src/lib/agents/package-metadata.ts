import type { AgentPackageMetadata, SupportedAgentPackage } from './types';

export const AGENT_PACKAGE_ORDER: SupportedAgentPackage[] = [
	'c15t',
	'@c15t/react',
	'@c15t/nextjs',
	'@c15t/backend',
];

export const AGENT_PACKAGE_METADATA: Record<
	SupportedAgentPackage,
	AgentPackageMetadata
> = {
	c15t: {
		packageName: 'c15t',
		blockId: 'core',
		packageLabel: 'c15t JavaScript',
		docsDir: 'node_modules/c15t/dist/docs/',
		headline:
			'read docs before changing consent flows, script loading, or c15t behavior',
		description:
			'Core c15t JavaScript docs for consent management, script loading, callbacks, and integrations.',
		workflowKeywords: [
			'consent management',
			'cookie banner',
			'script loader',
			'callbacks',
			'integrations',
		],
		appliesWhen: [
			'changing consent flows in a JavaScript app',
			'loading third-party scripts behind consent',
			'configuring callbacks or integrations',
		],
		startPages: [
			'quickstart.md',
			'script-loader.md',
			'callbacks.md',
			'integrations/google-tag-manager.md',
		],
		integrationExamples: ['integrations/google-tag-manager.md'],
	},
	'@c15t/react': {
		packageName: '@c15t/react',
		blockId: 'react',
		packageLabel: 'c15t React',
		docsDir: 'node_modules/@c15t/react/dist/docs/',
		headline:
			'read docs before changing consent flows, script loading, or c15t behavior',
		description:
			'React-focused c15t docs for consent UI, hooks, headless flows, and script integrations.',
		workflowKeywords: [
			'consent management',
			'cookie banner',
			'consent dialog',
			'preference center',
			'script loading',
		],
		appliesWhen: [
			'changing cookie banners, dialogs, or preference centers in a React app',
			'working on hooks, providers, or headless consent UI',
			'loading scripts or analytics behind consent',
		],
		startPages: [
			'quickstart.md',
			'headless.md',
			'building-headless-components.md',
			'callbacks.md',
			'integrations/google-tag-manager.md',
		],
		integrationExamples: ['integrations/google-tag-manager.md'],
	},
	'@c15t/nextjs': {
		packageName: '@c15t/nextjs',
		blockId: 'nextjs',
		packageLabel: 'c15t Next.js',
		docsDir: 'node_modules/@c15t/nextjs/dist/docs/',
		headline:
			'read docs before changing consent flows, script loading, or c15t behavior',
		description:
			'Next.js-focused c15t docs for consent UI, server-side behavior, callbacks, and integrations.',
		workflowKeywords: [
			'consent management',
			'cookie banner',
			'preference center',
			'server-side consent behavior',
			'script loading',
		],
		appliesWhen: [
			'changing consent flows in a Next.js app',
			'working on server-side consent behavior or callbacks',
			'loading scripts or analytics behind consent',
		],
		startPages: [
			'quickstart.md',
			'server-side.md',
			'callbacks.md',
			'script-loader.md',
			'integrations/google-tag-manager.md',
		],
		integrationExamples: [
			'integrations/google-tag-manager.md',
			'integrations/posthog.md',
		],
	},
	'@c15t/backend': {
		packageName: '@c15t/backend',
		blockId: 'backend',
		packageLabel: 'c15t Backend',
		docsDir: 'node_modules/@c15t/backend/dist/docs/',
		headline:
			'read docs before changing consent backend behavior, configuration, or policy packs',
		description:
			'Self-hosted c15t backend docs for configuration, policy packs, APIs, and operational behavior.',
		workflowKeywords: [
			'self-hosted consent backend',
			'policy packs',
			'storage adapters',
			'audit logs',
			'API behavior',
		],
		appliesWhen: [
			'changing self-hosted consent backend behavior',
			'working on backend configuration or APIs',
			'editing policy packs, storage, or observability setup',
		],
		startPages: [
			'quickstart.md',
			'guides/database-setup.md',
			'guides/policy-packs.md',
			'api/configuration.md',
		],
	},
};
