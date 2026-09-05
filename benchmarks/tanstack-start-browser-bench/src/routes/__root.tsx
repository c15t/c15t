import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router';

/**
 * Bare document shell. Each scenario route mounts its own consent provider,
 * the way each Next arm has its own `layout.tsx`, so the root stays free of
 * consent code and the `baseline` arm measures the page floor.
 */
const RootComponent = () => (
	<html lang="en">
		<head>
			<HeadContent />
		</head>
		<body>
			<Outlet />
			<Scripts />
		</body>
	</html>
);

export const Route = createRootRoute({
	component: RootComponent,
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ content: 'width=device-width, initial-scale=1', name: 'viewport' },
			{ title: 'c15t TanStack Start Browser Bench' },
		],
	}),
});
