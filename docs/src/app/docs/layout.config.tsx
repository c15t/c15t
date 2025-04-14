import { GithubInfo } from 'fumadocs-ui/components/github-info';
import type { DocsLayoutProps } from '~/components/layouts/notebook';

import { C15TLogo } from '~/components/logo';
import packageJson from '../../../../packages/core/package.json';
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
	],
};
