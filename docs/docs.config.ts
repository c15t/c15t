import { defineDocsConfig } from 'leadtype';

export default defineDocsConfig({
	groups: [
		{
			slug: 'frameworks',
			title: 'Frameworks',
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
			title: 'Self-hosting',
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
				body: 'These docs describe v3. Start with Inth hosted setup, identify the framework, router and deployment, then read its quickstart. Static sites can use Inth directly. Use page Markdown and package-bundled docs for targeted context. Verify scripts, rejection, reload and preferences; banner visibility alone is insufficient.',
				heading: 'Using these docs',
				type: 'markdown',
			},
			{
				heading: 'Start here',
				links: [
					{ urlPath: '/docs/guides/inth' },
					{ urlPath: '/docs/frameworks' },
					{ urlPath: '/docs/customization/overview' },
					{ urlPath: '/docs/guides/verify-consent' },
					{ urlPath: '/docs/upgrade-v3' },
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
			pages: ['index', 'guides/inth', 'frameworks/index'],
			title: 'Start here',
		},
		{
			base: 'guides',
			pages: [
				'deployment-modes',
				'consent-state',
				'verify-consent',
				'troubleshooting',
			],
			title: 'Understand consent',
		},
		{
			base: 'frameworks/next',
			children: [
				{
					pages: ['concepts/consent-categories', 'concepts/policy-presets'],
					title: 'Policies',
				},
				{
					pages: ['script-loader', 'troubleshooting'],
					title: 'Integration',
				},
				{
					pages: [
						'components/consent-manager-provider',
						'components/consent-banner',
						'components/consent-dialog-trigger',
						'components/dev-tools',
					],
					title: 'Components',
				},
				{
					pages: [
						'styling/overview',
						'hooks/use-consent-manager/overview',
						'headless',
						'iab/overview',
					],
					title: 'Customization and state',
				},
			],
			pages: [
				'quickstart',
				'app-router',
				'pages-router',
				'static-export',
				'server-side',
			],
			title: 'Next.js',
		},
		{
			base: 'frameworks/react',
			children: [
				{
					pages: ['concepts/consent-categories', 'concepts/policy-presets'],
					title: 'Policies',
				},
				{
					pages: ['script-loader', 'troubleshooting'],
					title: 'Integration',
				},
				{
					pages: [
						'components/consent-manager-provider',
						'components/consent-banner',
						'components/consent-dialog-trigger',
						'components/dev-tools',
					],
					title: 'Components',
				},
				{
					pages: [
						'styling/overview',
						'hooks/use-consent-manager/overview',
						'headless',
						'iab/overview',
					],
					title: 'Customization and state',
				},
			],
			pages: ['quickstart'],
			title: 'React',
		},
		{
			base: 'frameworks/vue',
			pages: ['quickstart'],
			title: 'Vue',
		},
		{
			base: 'frameworks/nuxt',
			pages: ['quickstart'],
			title: 'Nuxt',
		},
		{
			base: 'frameworks/svelte',
			pages: ['quickstart'],
			title: 'Svelte',
		},
		{
			base: 'frameworks/sveltekit',
			pages: ['quickstart'],
			title: 'SvelteKit',
		},
		{
			base: 'frameworks/astro',
			pages: ['quickstart'],
			title: 'Astro',
		},
		{
			base: 'frameworks/tanstack-start',
			pages: ['quickstart'],
			title: 'TanStack Start',
		},
		{
			base: 'frameworks/javascript',
			children: [
				{
					pages: ['concepts/consent-categories', 'concepts/policy-presets'],
					title: 'Policies',
				},
				{
					pages: ['script-loader', 'troubleshooting'],
					title: 'Integration',
				},
				{
					pages: ['api/overview', 'building-ui', 'dev-tools', 'iab/overview'],
					title: 'API and UI',
				},
			],
			pages: ['quickstart'],
			title: 'JavaScript',
		},
		{
			base: 'customization',
			pages: ['overview', 'recipes', 'tokens', 'slots', 'translations'],
			title: 'Customize',
		},
		{
			base: 'integrations',
			pages: [
				'overview',
				'google-tag-manager',
				'google-tag',
				'meta-pixel',
				'intercom',
				'google-maps',
				'building-integrations',
			],
			title: 'Integrations',
		},
		{
			pages: ['upgrade-v3'],
			title: 'Migrate to v3',
		},
		{
			base: 'cli',
			pages: ['overview', 'quickstart', 'commands/setup', 'global-flags'],
			title: 'CLI',
		},
		{
			base: 'self-host',
			pages: [
				'quickstart',
				'guides/database-setup',
				'api/configuration',
				'api/endpoints',
			],
			title: 'Self-hosting',
		},
		{
			pages: [
				'comparisons/index',
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
