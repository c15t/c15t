import type { DocsLayoutProps } from '~/components/layouts/notebook';

import { C15TLogo } from '~/components/logo';

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
		title: <C15TLogo className="h-6 w-auto" />,
	},
	links: [
		{
			text: 'Documentation',
			url: '/docs',
			active: 'nested-url',
		},
	],
};
