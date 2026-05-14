import { defineDocsConfig } from 'leadtype';

export default defineDocsConfig({
	product: {
		name: 'c15t',
		summary:
			'Developer-first consent management for JavaScript, React, Next.js, and self-hosted deployments.',
		bullets: [
			'Add GDPR-ready cookie banners, consent dialogs, and preference flows.',
			'Use framework-specific guides for JavaScript, React, and Next.js.',
			'Load scripts, iframes, and analytics only after the required consent.',
			'Self-host the consent backend when managed hosting is not the right fit.',
		],
		bestStartingPoints: [
			{ urlPath: '/docs/frameworks/next/quickstart' },
			{ urlPath: '/docs/frameworks/react/quickstart' },
			{ urlPath: '/docs/frameworks/javascript/quickstart' },
			{ urlPath: '/docs/self-host/quickstart' },
			{ urlPath: '/docs/cli/quickstart' },
			{ urlPath: '/changelog' },
		],
		agentGuidance:
			'Start with the framework-specific quickstart for the target app. Use /docs/llms.txt for routing and /llms-full.txt when page-level context is not enough.',
	},
	groups: [
		{
			slug: 'frameworks',
			title: 'Frameworks',
			description:
				'Install and configure c15t in JavaScript, React, and Next.js applications.',
		},
		{
			slug: 'self-host',
			title: 'Self Host',
			description:
				'Run the c15t backend, configure storage, and operate consent infrastructure.',
		},
		{
			slug: 'integrations',
			title: 'Integrations',
			description:
				'Connect analytics, advertising, and tag-management tools behind consent.',
		},
		{
			slug: 'cli',
			title: 'CLI',
			description:
				'Scaffold, migrate, and configure c15t projects from the command line.',
		},
		{
			slug: 'reference',
			title: 'Reference',
			description:
				'Concepts, legal templates, open-source policies, and contributor documentation.',
		},
		{
			slug: 'changelog',
			title: 'Changelog',
			description:
				'Release notes and migration context for c15t package versions.',
		},
	],
});
