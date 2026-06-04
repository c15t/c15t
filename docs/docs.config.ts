import { defineDocsConfig, defineFrameworkNavigation } from 'leadtype';

const generateDocsConfig = () => {
	return defineDocsConfig({
		product: {
			name: 'c15t',
			tagline:
				'Developer-first consent management for JavaScript, React, Next.js, and self-hosted deployments.',
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
		navigation: [
			defineFrameworkNavigation({
				title: 'Frameworks',
				base: 'frameworks',
				pages: ['index'],
				templates: {
					componentFramework: {
						pages: ['quickstart', 'optimization', '/ai-agents'],
						children: [
							{
								title: 'Concepts',
								pages: [
									'concepts/initialization-flow',
									'concepts/client-modes',
									'concepts/consent-models',
									'concepts/policy-packs',
									'concepts/consent-categories',
									'concepts/cookie-management',
									'concepts/glossary',
								],
							},
							{
								title: 'Guides',
								pages: [
									'script-loader',
									'iframe-blocking',
									'network-blocker',
									'callbacks',
									'internationalization',
									'policy-packs',
									'server-side',
								],
							},
							{
								title: 'Components',
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
							},
							{
								title: 'Styling',
								pages: [
									'styling/overview',
									'styling/tokens',
									'styling/slots',
									'styling/classnames',
									'styling/tailwind',
									'styling/color-scheme',
									'styling/css-variables',
								],
							},
							{
								title: 'Hooks',
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
									'hooks/use-ssr-status',
									'hooks/use-draggable',
								],
							},
							{
								title: 'Troubleshooting',
								pages: ['troubleshooting'],
							},
							{
								title: 'Headless',
								pages: ['building-headless-components', 'headless'],
							},
							{
								title: 'IAB TCF',
								pages: [
									'iab/overview',
									'iab/consent-banner',
									'iab/consent-dialog',
									'iab/use-gvl-data',
								],
							},
						],
					},
					javascript: {
						pages: ['quickstart', 'optimization', '/ai-agents'],
						children: [
							{
								title: 'Concepts',
								pages: [
									'concepts/initialization-flow',
									'concepts/client-modes',
									'concepts/consent-models',
									'concepts/policy-packs',
									'concepts/consent-categories',
									'concepts/cookie-management',
									'concepts/glossary',
								],
							},
							{
								title: 'Guides',
								pages: [
									'script-loader',
									'iframe-blocking',
									'network-blocker',
									'callbacks',
									'internationalization',
									'policy-packs',
								],
							},
							{
								title: 'Store API',
								pages: [
									'api/overview',
									'api/checking-consent',
									'api/setting-consent',
									'api/location-info',
								],
							},
							{
								title: 'Building Framework Libraries',
								pages: ['building-ui'],
							},
							{
								title: 'Troubleshooting',
								pages: ['troubleshooting'],
							},
							{
								title: 'IAB TCF',
								pages: ['iab/overview'],
							},
						],
					},
				},
				frameworks: [
					{
						title: 'React',
						base: 'react',
						template: 'componentFramework',
					},
					{
						title: 'JavaScript',
						base: 'javascript',
						template: 'javascript',
					},
					{
						title: 'Next.js',
						base: 'next',
						template: 'componentFramework',
					},
				],
			}),
			{
				title: 'CLI',
				base: 'cli',
				pages: ['overview', 'quickstart'],
				children: [
					{
						title: 'Commands',
						pages: [
							'commands/setup',
							'commands/generate',
							'commands/codemods',
							'commands/self-host',
							'commands/skills',
							'commands/auth',
						],
					},
					{
						title: 'Reference',
						pages: ['global-flags', 'telemetry'],
					},
				],
			},
			{
				title: 'Integrations',
				base: 'integrations',
				pages: ['overview', 'building-integrations'],
				children: [
					{
						title: 'Analytics',
						pages: [
							'google-tag',
							'ahrefs-analytics',
							'cloudflare-web-analytics',
							'microsoft-clarity',
							'databuddy',
							'fathom-analytics',
							'matomo-analytics',
							'mixpanel-analytics',
							'hotjar',
							'plausible-analytics',
							'posthog',
							'promptwatch',
							'segment',
							'rybbit-analytics',
							'umami-analytics',
							'vercel-analytics',
						],
					},
					{
						title: 'Functional',
						pages: ['crisp', 'intercom'],
					},
					{
						title: 'Ads & Pixels',
						pages: [
							'meta-pixel',
							'reddit-pixel',
							'tiktok-pixel',
							'linkedin-insights',
							'microsoft-uet',
							'snapchat-pixel',
							'x-pixel',
						],
					},
					{
						title: 'Tag Managers',
						pages: ['google-tag-manager'],
					},
				],
			},
			{
				title: 'Self Host',
				base: 'self-host',
				pages: ['quickstart'],
				children: [
					{
						title: 'Guides',
						pages: [
							'guides/database-setup',
							'guides/framework-integration',
							'guides/edge-deployment',
							'guides/caching',
							'guides/iab-tcf',
							'guides/policy-packs',
							'guides/observability',
						],
					},
					{
						title: 'API Reference',
						pages: ['api/endpoints', 'api/configuration'],
					},
				],
			},
			{
				title: 'Contributing',
				base: 'contributing',
				pages: ['index', 'docs-preview-action', 'documentation-setup'],
			},
			{
				title: 'Open Source',
				base: 'oss',
				pages: [
					'why-open-source',
					'contributing',
					'code-of-conduct',
					'license',
				],
			},
			{
				title: 'Legal',
				base: 'legals',
				pages: ['cookie-policy', 'privacy-policy'],
				optional: true,
			},
		],
	});
};

export default generateDocsConfig();
