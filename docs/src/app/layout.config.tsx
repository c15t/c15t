import { BaseLayoutProps } from '~/components/layouts/shared';
import { C15TLogo } from '~/components/logo';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
	nav: {
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
