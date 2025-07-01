export const siteConfig = {
	name: 'Consent Management',
	description:
		'Leverage native React components for seamless integration and high performance in a robust Consent Management solution that empowers your development team while prioritizing privacy and compliance.',
	url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
	keywords: [
		'Privacy Management',
		'GDPR Compliance',
		'Consent Management',
		'Privacy Infrastructure',
		'Consent Infrastructure',
	],
	links: {
		email: 'support@c15t.com',
		github: 'https://github.com/c15t/c15t',
	},
	hero: {
		title: 'Consent Management Redefined',
		description:
			'Leverage native React components for seamless integration and high performance in a robust Consent Management solution that empowers your development team while prioritizing privacy and compliance.',
		cta: { text: 'Get Started', href: '/docs/nextjs/quickstart' },
	},

	footer: {
		links: [
			{
				title: 'Product',
				items: [
					{ text: 'Documentation', url: '/docs' },
					{ text: 'Components', url: '/docs/components/react/cookie-banner' },
				],
			},
			{
				title: 'Company',
				items: [
					{
						text: 'GitHub',
						url: 'https://github.com/c15t/c15t',
						external: true,
					},
					{
						text: 'Contact',
						url: 'mailto:support@c15t.com',
						external: true,
					},
				],
			},
			{
				title: 'Legal',
				items: [
					{ text: 'Privacy Policy', url: '/docs/legals/privacy-policy' },
					{ text: 'Cookie Policy', url: '/docs/legals/cookie-policy' },
				],
			},
		],
		bottomText:
			'Leverage native React components for seamless integration and high performance in a robust Consent Management solution that empowers your development team while prioritizing privacy and compliance.',
	},
};

export type SiteConfig = typeof siteConfig;
