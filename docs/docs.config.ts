import { defineDocsConfig, defineFrameworkNavigation } from 'leadtype';

const generateDocsConfig = () =>
	defineDocsConfig({
		groups: [
			{
				description:
					'Install and configure c15t in JavaScript, React, and Next.js applications.',

				slug: 'frameworks',
				title: 'Frameworks',
			},
			{
				description:
					'Run the c15t backend, configure storage, and operate consent infrastructure.',

				slug: 'self-host',
				title: 'Self Host',
			},
			{
				description:
					'Connect analytics, advertising, maps, media, and other third-party tools behind consent.',

				slug: 'integrations',
				title: 'Integrations',
			},
			{
				description:
					'Scaffold, migrate, and configure c15t projects from the command line.',

				slug: 'cli',
				title: 'CLI',
			},
			{
				description:
					'Concepts, legal templates, open-source policies, and contributor documentation.',

				slug: 'reference',
				title: 'Reference',
			},
			{
				description:
					'Release notes and migration context for c15t package versions.',

				slug: 'changelog',
				title: 'Changelog',
			},
		],
		navigation: [
			defineFrameworkNavigation({
				base: 'frameworks',
				frameworks: [
					{
						base: 'react',
						template: 'componentFramework',

						title: 'React',
					},
					{
						base: 'javascript',
						template: 'javascript',

						title: 'JavaScript',
					},
					{
						base: 'next',
						template: 'componentFramework',

						title: 'Next.js',
					},
				],

				pages: ['index'],
				templates: {
					componentFramework: {
						children: [
							{
								pages: ['concepts/consent-categories'],

								title: 'Concepts',
							},
							{
								pages: ['script-loader', 'server-side'],

								title: 'Guides',
							},
							{
								pages: [
									'components/consent-manager-provider',
									'components/consent-banner',
									'components/dev-tools',
								],

								title: 'Components',
							},
							{
								pages: ['styling/overview'],

								title: 'Styling',
							},
							{
								pages: ['hooks/use-consent-manager/overview'],

								title: 'Hooks',
							},
							{
								pages: ['troubleshooting'],

								title: 'Troubleshooting',
							},
							{
								pages: ['headless'],

								title: 'Headless',
							},
							{
								pages: ['iab/overview'],

								title: 'IAB TCF',
							},
						],

						pages: ['quickstart'],
					},
					javascript: {
						children: [
							{
								pages: ['concepts/consent-categories'],

								title: 'Concepts',
							},
							{
								pages: ['script-loader'],

								title: 'Guides',
							},
							{
								pages: ['api/overview'],

								title: 'Store API',
							},
							{
								pages: ['building-ui'],

								title: 'Building Framework Libraries',
							},
							{
								pages: ['troubleshooting'],

								title: 'Troubleshooting',
							},
							{
								pages: ['iab/overview'],

								title: 'IAB TCF',
							},
						],

						pages: ['quickstart'],
					},
				},
				title: 'Frameworks',
			}),
			{
				base: 'cli',
				children: [
					{
						pages: ['commands/setup'],

						title: 'Commands',
					},
					{
						pages: ['global-flags'],

						title: 'Reference',
					},
				],

				pages: ['overview', 'quickstart'],
				title: 'CLI',
			},
			{
				base: 'integrations',
				children: [
					{
						pages: ['google-maps'],

						title: 'Renderable',
					},
					{
						pages: ['google-tag-manager'],

						title: 'Tag Managers',
					},
					{
						pages: ['google-tag'],

						title: 'Analytics',
					},
					{
						pages: ['intercom'],

						title: 'Functional',
					},
					{
						pages: ['meta-pixel'],

						title: 'Ads & Pixels',
					},
				],

				pages: ['overview', 'building-integrations'],
				title: 'Integrations',
			},
			{
				base: 'self-host',
				children: [
					{
						pages: ['guides/database-setup'],

						title: 'Guides',
					},
					{
						pages: ['api/endpoints', 'api/configuration'],

						title: 'API Reference',
					},
				],

				pages: ['quickstart'],
				title: 'Self Host',
			},
			{
				base: 'contributing',
				pages: ['index'],

				title: 'Contributing',
			},
			{
				base: 'oss',
				pages: [
					'why-open-source',
					'contributing',
					'code-of-conduct',
					'license',
				],

				title: 'Open Source',
			},
			{
				base: 'legals',
				optional: true,

				pages: ['cookie-policy', 'privacy-policy'],
				title: 'Legal',
			},
		],
		product: {
			agentGuidance:
				'Start with the framework-specific quickstart for the target app. Use /docs/llms.txt for routing and /llms-full.txt when page-level context is not enough.',

			bestStartingPoints: [
				{ urlPath: '/docs/frameworks/next/quickstart' },
				{ urlPath: '/docs/frameworks/react/quickstart' },
				{ urlPath: '/docs/frameworks/javascript/quickstart' },
				{ urlPath: '/docs/self-host/quickstart' },
				{ urlPath: '/docs/cli/quickstart' },
				{ urlPath: '/changelog' },
			],
			bullets: [
				'Add GDPR-ready cookie banners, consent dialogs, and preference flows.',
				'Use framework-specific guides for JavaScript, React, and Next.js.',
				'Load scripts, iframes, and analytics only after the required consent.',
				'Self-host the consent backend when managed hosting is not the right fit.',
			],
			name: 'c15t',
			summary:
				'Developer-first consent management for JavaScript, React, Next.js, and self-hosted deployments.',
			tagline:
				'Developer-first consent management for JavaScript, React, Next.js, and self-hosted deployments.',
		},
	});

export default generateDocsConfig();
