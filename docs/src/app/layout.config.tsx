import type { BaseLayoutProps } from '~/components/layouts/shared';
import { C15TLogo } from '~/components/logo';

import { GithubInfo } from 'fumadocs-ui/components/github-info';
import { version } from '../../../packages/core/package.json';

/**
 * Defines the navigation structure and menu items for the docs.
 *
 * @see BaseLayoutProps for all available configuration options
 */
export const docsOptions: BaseLayoutProps = {
	nav: {
		title: (
			<>
				<C15TLogo className="h-6 w-auto" />
				<span className="font-medium text-sm">{version}</span>
			</>
		),
		transparentMode: 'top',
	},
	links: [
		{
			type: 'custom',
			children: <GithubInfo owner="c15t" repo="c15t" />,
		},
	],
};

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
				<span className="font-medium text-sm">{version}</span>
			</>
		),
		transparentMode: 'top',
	},

	links: [
		{
			text: 'Getting Started',
			url: '/docs',
		},
		// {
		// 	text: 'Core',
		// 	url: '/docs/core',
		// },
		// {
		// 	type: 'menu',
		// 	text: 'React',
		// 	url: '/docs/framework/react',
		// 	items: [
		// 		{
		// 			menu: {
		// 				banner: (
		// 					<div className="-mx-3 -mt-3">
		// 						<Image
		// 							src={GetStarted}
		// 							alt="Preview of getting started guide"
		// 							className="rounded-t-lg object-cover"
		// 							style={{
		// 								maskImage:
		// 									'linear-gradient(to bottom,white 60%,transparent)',
		// 							}}
		// 						/>
		// 					</div>
		// 				),
		// 				className: 'md:row-span-2',
		// 			},
		// 			icon: <Book />,
		// 			text: 'Getting Started',
		// 			description:
		// 				'Our plug-and-play components handle compliance so you can focus on your product',
		// 			url: '/docs/framework/react',
		// 		},
		// 		{
		// 			icon: <Cookie />,
		// 			text: 'Cookie Banner',
		// 			description:
		// 				'A customizable cookie consent banner that handles privacy compliance with zero configuration required.',
		// 			url: '/docs/framework/react/cookie-banner',
		// 			menu: {
		// 				className: 'lg:col-start-2',
		// 			},
		// 		},
		// 		{
		// 			icon: <MessageSquare />,
		// 			text: 'Consent Dialog',
		// 			description:
		// 				'An accessible, animated modal interface that wraps the Consent Manager Widget for a focused privacy customization experience.',
		// 			url: '/docs/framework/react/consent-manager-dialog',
		// 			menu: {
		// 				className: 'lg:col-start-2',
		// 			},
		// 		},
		// 		{
		// 			icon: <MessageSquareCode />,
		// 			text: 'Consent Widget',
		// 			description:
		// 				'A flexible, composable widget for building custom privacy consent interfaces.',
		// 			url: '/docs/framework/react/consent-manager-widget',
		// 			menu: {
		// 				className: 'lg:col-start-3 lg:row-start-1',
		// 			},
		// 		},
		// 		{
		// 			icon: <Palette />,
		// 			text: 'Styling',
		// 			description:
		// 				'Learn how to customize the appearance of @c15t/react components through our flexible theming system.',
		// 			url: '/docs/framework/react/guides/customization',
		// 			menu: {
		// 				className: 'lg:col-start-3',
		// 			},
		// 		},
		// 	],
		// },
		{
			type: 'custom',
			secondary: true,
			children: <GithubInfo owner="c15t" repo="c15t" />,
		},
	],
};
