import { defineDocsConfig } from 'leadtype';

export default defineDocsConfig({
	groups: [
		{
			slug: 'frameworks',
			title: 'Frameworks',
		},
		{
			slug: 'concepts',
			title: 'Concepts',
		},
		{
			slug: 'guides',
			title: 'Guides',
		},
		{
			slug: 'customization',
			title: 'Customization',
		},
		{
			slug: 'integrations',
			title: 'Integrations',
		},
		{
			slug: 'cli',
			title: 'CLI',
		},
		{
			slug: 'self-host',
			title: 'Backend',
		},
		{
			slug: 'reference',
			title: 'Reference',
		},
		{
			slug: 'changelog',
			title: 'Changelog',
		},
	],
	llms: {
		sections: [
			{
				body: 'These docs describe c15t v3. Find the app in Choose your setup, then follow that framework guide from start to finish; it names the files to create and the backend URL to use. Install c15t packages with the @alpha dist-tag, because npm latest is still v2. A visible banner does not prove anything: check that vendor requests wait for consent, that rejection survives a reload, and that preferences can be reopened.',
				heading: 'Using these docs',
				type: 'markdown',
			},
			{
				heading: 'Start here',
				links: [
					{
						urlPath: '/docs/concepts/choose-your-setup',
					},
					{
						urlPath: '/docs/concepts/how-consent-works',
					},
					{
						urlPath: '/docs/customization/overview',
					},
					{
						urlPath: '/docs/guides/verify-consent',
					},
					{
						urlPath: '/docs/upgrade-v3',
					},
				],
				type: 'links',
			},
			{
				body: '[Documentation index](https://c15t.com/docs/llms.txt) · [Full Markdown context](https://c15t.com/llms-full.txt). Prefer the index and individual pages for focused tasks.',
				heading: 'More documentation',
				type: 'markdown',
			},
		],
	},
	navigation: [
		{
			pages: ['index', 'concepts/choose-your-setup', 'examples'],
			title: 'Getting started',
		},
		{
			base: 'frameworks',
			children: [
				{
					base: 'next',
					children: [
						{
							pages: [
								'optimization',
								'script-loader',
								'network-blocker',
								'geography-headers',
								'content-security-policy',
								'troubleshooting',
							],
							title: 'Integration',
						},
						{
							pages: [
								'components/consent-manager-provider',
								'components/consent-banner',
								'components/consent-dialog',
								'components/consent-widget',
								'components/consent-dialog-link',
								'components/consent-dialog-trigger',
								'components/consent-gate',
								'components/dev-tools',
							],
							title: 'Components',
						},
						{
							pages: ['styling/overview'],
							title: 'Styling',
						},
						{
							pages: ['hooks/overview'],
							title: 'Hooks',
						},
						{
							pages: ['headless'],
							title: 'Headless',
						},
						{
							pages: ['iab/overview'],
							title: 'IAB TCF',
						},
						{
							pages: ['api-reference/data-fetching'],
							title: 'Reference',
						},
					],
					pages: [
						'quickstart',
						'data-fetching',
						'app-router',
						'pages-router',
						'static-export',
						'server-side',
						'client-side',
					],
					slug: 'next',
					title: 'Next.js',
				},
				{
					base: 'tanstack-start',
					pages: ['quickstart'],
					slug: 'tanstack-start',
					title: 'TanStack Start',
				},
				{
					base: 'react',
					children: [
						{
							pages: ['script-loader', 'network-blocker', 'troubleshooting'],
							title: 'Integration',
						},
						{
							pages: [
								'components/consent-manager-provider',
								'components/consent-banner',
								'components/consent-dialog',
								'components/consent-widget',
								'components/consent-dialog-link',
								'components/consent-dialog-trigger',
								'components/consent-gate',
								'components/dev-tools',
							],
							title: 'Components',
						},
						{
							pages: ['styling/overview'],
							title: 'Styling',
						},
						{
							pages: ['hooks/overview'],
							title: 'Hooks',
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
					slug: 'react',
					title: 'React',
				},
				{
					base: 'nuxt',
					pages: ['quickstart'],
					slug: 'nuxt',
					title: 'Nuxt',
				},
				{
					base: 'vue',
					pages: ['quickstart'],
					slug: 'vue',
					title: 'Vue',
				},
				{
					base: 'astro',
					pages: ['quickstart'],
					slug: 'astro',
					title: 'Astro',
				},
				{
					base: 'svelte',
					pages: ['quickstart'],
					slug: 'svelte',
					title: 'Svelte',
				},
				{
					base: 'sveltekit',
					pages: ['quickstart'],
					slug: 'sveltekit',
					title: 'SvelteKit',
				},
				{
					base: 'javascript',
					children: [
						{
							pages: ['script-tag', 'script-loader', 'troubleshooting'],
							title: 'Integration',
						},
						{
							pages: [
								'api/overview',
								'building-ui',
								'dev-tools',
								'iab/overview',
							],
							title: 'API and UI',
						},
					],
					pages: ['quickstart'],
					slug: 'javascript',
					title: 'JavaScript',
				},
				{
					base: 'react-native',
					children: [
						{
							pages: ['configuration'],
							title: 'Configuration',
						},
						{
							pages: ['native-behaviour', 'platform-support'],
							title: 'Native runtime',
						},
						{
							pages: ['troubleshooting'],
							title: 'Integration',
						},
					],
					pages: ['quickstart', 'usage'],
					slug: 'react-native',
					title: 'React Native',
				},
			],
			pages: ['index'],
			slug: 'frameworks',
			title: 'Frameworks',
		},
		{
			base: 'concepts',
			pages: [
				'how-consent-works',
				'consent-categories',
				'policies',
				'data-fetching',
				'consent-state',
			],
			title: 'Concepts',
		},
		{
			base: 'guides',
			pages: ['verify-consent', 'troubleshooting', 'shared-consent-controls'],
			title: 'Verify and troubleshoot',
		},
		{
			base: 'customization',
			pages: ['overview', 'recipes', 'tokens', 'slots', 'translations'],
			title: 'Customize',
		},
		{
			base: 'integrations',
			children: [
				{
					pages: ['google-maps', 'youtube'],
					slug: 'embeds',
					title: 'Embeds',
				},
				{
					pages: ['google-tag-manager', 'cloudflare-zaraz'],
					slug: 'tag-managers',
					title: 'Tag managers',
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
						'one-dollar-stats',
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
					slug: 'analytics',
					title: 'Analytics',
				},
				{
					pages: ['crisp', 'front-chat', 'intercom'],
					slug: 'functionality',
					title: 'Functionality',
				},
				{
					pages: [
						'meta-pixel',
						'openai-pixel',
						'pinterest-tag',
						'reddit-pixel',
						'tiktok-pixel',
						'linkedin-insights',
						'microsoft-uet',
						'snapchat-pixel',
						'x-pixel',
					],
					slug: 'ads-and-pixels',
					title: 'Ads and pixels',
				},
			],
			pages: [
				'overview',
				'building-integrations',
				'granular-consent',
				'clear-on-revocation',
			],
			slug: 'integrations',
			title: 'Integrations',
		},
		{
			pages: ['upgrade-v3'],
			title: 'Migrate to v3',
		},
		{
			base: 'cli',
			pages: [
				'overview',
				'quickstart',
				'commands/setup',
				'commands/boilerplate',
				'commands/hosted',
				'commands/self-host',
				'commands/codemods',
				'global-flags',
				'automation',
			],
			title: 'CLI',
		},
		{
			base: 'self-host',
			children: [
				{
					pages: [
						'guides/database-setup',
						'guides/framework-integration',
						'guides/policy-packs',
						'guides/caching',
						'guides/edge-deployment',
						'guides/iab-tcf',
						'guides/legal-document-snapshot-integration',
						'guides/observability',
					],
					title: 'Guides',
				},
				{
					pages: ['api/configuration', 'api/endpoints'],
					title: 'API',
				},
			],
			pages: ['overview', 'quickstart'],
			slug: 'self-host',
			title: 'Backend',
		},
		{
			base: 'comparisons',
			pages: [
				'index',
				'cookiebot',
				'cookieconsent-v3',
				'didomi',
				'iubenda',
				'klaro',
				'onetrust',
				'osano',
				'react-cookie-consent',
				'silktide-consent-manager',
				'tarteaucitron',
				'usercentrics',
			],
			title: 'Comparisons',
		},
		{
			pages: [
				'comparison',
				'contributing/index',
				'oss/why-open-source',
				'oss/contributing',
				'oss/code-of-conduct',
				'oss/license',
			],
			title: 'Project',
		},
		{
			base: 'legals',
			optional: true,
			pages: ['cookie-policy', 'privacy-policy'],
			title: 'Legal',
		},
	],
	product: {
		docs: 'https://c15t.com/docs',
		homepage: 'https://c15t.com',
		kind: 'library',
		name: 'c15t',
		repository: 'https://github.com/c15t/c15t',
		tagline:
			'Consent management for React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Astro, TanStack Start and JavaScript.',
	},
});
