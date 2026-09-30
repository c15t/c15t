import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentRoot,
	offline,
} from 'c15t/tanstack-start';

import appCss from '../styles.css?url';

const mode = offline({
	policyRules: [
		{
			id: 'tailwind-matrix',
			match: { isDefault: true },
			model: 'opt-in',
			prompt: 'choice',
		},
	],
});

const RootComponent = () => (
	<html lang="en">
		<head>
			<HeadContent />
		</head>
		<body>
			<ConsentRoot
				persistence={false}
				state={{}}
				// #region docs:slot
				options={{
					components: {
						banner: {
							root: { className: '!p-[7px] dark:!p-[11px]' },
						},
					},
					mode,
				}}
				// #endregion docs:slot
			>
				<Outlet />
				<ConsentBanner />
				<ConsentDialog />
			</ConsentRoot>
			<Scripts />
		</body>
	</html>
);

export const Route = createRootRoute({
	component: RootComponent,
	head: () => ({
		links: [{ href: appCss, rel: 'stylesheet' }],
		meta: [
			{ charSet: 'utf-8' },
			{ content: 'width=device-width, initial-scale=1', name: 'viewport' },
			{ title: 'c15t + Tailwind: TanStack Start' },
		],
	}),
});
