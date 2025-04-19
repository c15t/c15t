import type { BaseLayoutProps } from '~/components/layouts/shared';
import { C15TLogo } from '~/components/logo';

import { GithubInfo } from 'fumadocs-ui/components/github-info';
import { JSIcon, NextIcon, ReactIcon } from '~/components/icons';
import { DiscordIcon } from '~/components/icons/discord';
import { RedditIcon } from '~/components/icons/reddit';
import { XIcon } from '~/components/icons/x';
import packageJson from '../../../packages/core/package.json';

/**
 * Layout configuration specific to the home page
 *
 * @see BaseLayoutProps for all available configuration options
 */
export const homePageOptions: BaseLayoutProps = {
	nav: {
		title: (
			<>
				<C15TLogo className="h-6 w-auto" />
				<span className="font-medium text-sm">{packageJson.version}</span>
			</>
		),
		transparentMode: 'top',
	},

	links: [
		{
			type: 'menu',
			text: 'Get Started',
			url: '/docs/get-started',
			items: [
				{
					icon: <NextIcon />,
					text: 'Next.js',
					description: 'Build your privacy consent interface with Next.js',
					url: '/docs/nextjs/quickstart',
				},
				{
					icon: <ReactIcon className="text-[#61DAFB]" />,
					text: 'React',
					description: 'Build your privacy consent interface with React',
					url: '/docs/react/quickstart',
				},
				{
					icon: <JSIcon />,
					text: 'Javascript',
					description: 'Build your privacy consent interface with Javascript',
					url: '/docs/javascript/quickstart',
				},
			],
		},
		{
			icon: <XIcon />,
			text: 'X',
			url: 'https://x.com/consentdotio',
			type: 'icon',
		},
		{
			icon: <RedditIcon />,
			text: 'Reddit',
			url: 'https://www.reddit.com/r/c15t',
			type: 'icon',
		},
		{
			icon: <DiscordIcon />,
			text: 'Discord',
			url: 'https://c15t.com/discord',
			type: 'icon',
		},
		{
			type: 'custom',
			secondary: true,
			children: <GithubInfo owner="c15t" repo="c15t" />,
		},
	],
};
