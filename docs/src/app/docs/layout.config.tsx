import type { DocsLayoutProps } from '~/components/layouts/notebook';
import { DiscordIcon } from '~/components/icons/discord';
import { RedditIcon } from '~/components/icons/reddit';
import { XIcon } from '~/components/icons/x';
import { C15TLogo } from '~/components/logo';
import packageJson from '../../../../packages/core/package.json';
import { ThemeToggle } from '~/components/layout/theme-toggle';
import { GithubInfo } from 'fumadocs-ui/components/github-info';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const docsOptions: Omit<DocsLayoutProps, 'tree'> = {
	sidebar: {
		collapsible: false,
	},
	nav: {
		mode: 'top',
		title: (
			<>
				<C15TLogo className="h-6 w-auto" />
				<span className="font-medium text-sm">{packageJson.version}</span>
			</>
		),
	},
	links: [
		{
			type: 'custom',
			secondary: true,
			children: <GithubInfo owner="c15t" repo="c15t" />,
		},
		{
			type: 'custom',
			secondary: true,
			children: <ThemeToggle className="ml-2" />,
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
	],
};
