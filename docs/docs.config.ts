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
								pages: [
									'concepts/initialization-flow',
									'concepts/client-modes',
									'concepts/consent-models',
									'concepts/policy-packs',
									'concepts/consent-categories',
									'concepts/cookie-management',
									'concepts/glossary',
								],

								title: 'Concepts',
							},
							{
								pages: [
									'script-loader',
									'iframe-blocking',
									'network-blocker',
									'callbacks',
									'internationalization',
									'policy-packs',
									'server-side',
								],

								title: 'Guides',
							},
							{
								pages: [
									'components/consent-manager-provider',
									'components/consent-banner',
									'components/consent-dialog',
									'components/consent-widget',
									'components/consent-dialog-trigger',
									'components/consent-dialog-link',
									'components/frame',
									'components/dev-tools',
								],

								title: 'Components',
							},
							{
								pages: [
									'styling/overview',
									'styling/tokens',
									'styling/slots',
									'styling/classnames',
									'styling/tailwind',
									'styling/color-scheme',
									'styling/css-variables',
								],

								title: 'Styling',
							},
							{
								pages: [
									'hooks/use-consent-manager/overview',
									'hooks/use-consent-manager/checking-consent',
									'hooks/use-consent-manager/setting-consent',
									'hooks/use-consent-manager/location-info',
									'hooks/use-translations',
									'hooks/use-focus-trap',
									'hooks/use-color-scheme',
									'hooks/use-reduced-motion',
									'hooks/use-text-direction',
									'hooks/use-draggable',
								],

								title: 'Hooks',
							},
							{
								pages: ['troubleshooting'],

								title: 'Troubleshooting',
							},
							{
								pages: ['building-headless-components', 'headless'],

								title: 'Headless',
							},
							{
								pages: [
									'iab/overview',
									'iab/consent-banner',
									'iab/consent-dialog',
									'iab/use-gvl-data',
								],

								title: 'IAB TCF',
							},
						],

						pages: [
							'quickstart',
							'optimization',
							'/granular-installs',
							'/ai-agents',
						],
					},
					javascript: {
						children: [
							{
								pages: [
									'concepts/initialization-flow',
									'concepts/client-modes',
									'concepts/consent-models',
									'concepts/policy-packs',
									'concepts/consent-categories',
									'concepts/cookie-management',
									'concepts/glossary',
								],

								title: 'Concepts',
							},
							{
								pages: [
									'script-loader',
									'iframe-blocking',
									'network-blocker',
									'callbacks',
									'internationalization',
									'policy-packs',
								],

								title: 'Guides',
							},
							{
								pages: [
									'api/overview',
									'api/checking-consent',
									'api/setting-consent',
									'api/location-info',
								],

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

						pages: [
							'quickstart',
							'optimization',
							'/granular-installs',
							'/ai-agents',
						],
					},
				},
				title: 'Frameworks',
			}),
			{
				base: 'cli',
				children: [
					{
						pages: [
							'commands/setup',
							'commands/generate',
							'commands/codemods',
							'commands/self-host',
							'commands/skills',
							'commands/auth',
						],

						title: 'Commands',
					},
					{
						pages: ['global-flags', 'telemetry'],

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
						pages: ['google-tag-manager'],

						title: 'Tag Managers',
					},
					{
						pages: [
							'google-tag',
							'ahrefs-analytics',
							'adobe-analytics',
							'amplitude',
							'cloudflare-web-analytics',
							'clearbit',
							'microsoft-clarity',
							'databuddy',
							'fathom-analytics',
							'heap',
							'matomo-analytics',
							'mixpanel-analytics',
							'hotjar',
							'hightouch',
							'logrocket',
							'plausible-analytics',
							'posthog',
							'promptwatch',
							'pirsch',
							'rudderstack',
							'segment',
							'rybbit-analytics',
							'umami-analytics',
							'vercel-analytics',
						],

						title: 'Analytics',
					},
					{
						pages: ['crisp', 'intercom'],

						title: 'Functional',
					},
					{
						pages: [
							'meta-pixel',
							'reddit-pixel',
							'tiktok-pixel',
							'linkedin-insights',
							'microsoft-uet',
							'snapchat-pixel',
							'x-pixel',
						],

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
						pages: [
							'guides/database-setup',
							'guides/framework-integration',
							'guides/edge-deployment',
							'guides/caching',
							'guides/iab-tcf',
							'guides/policy-packs',
							'guides/observability',
						],

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
				pages: ['index', 'docs-preview-action', 'documentation-setup'],

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
