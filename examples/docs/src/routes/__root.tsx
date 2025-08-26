import { TanstackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { ThemeToggle } from '../components/theme-toggle';
import { ThemeProvider } from '../contexts/theme-context';

export const Route = createRootRoute({
	component: () => (
		<ThemeProvider>
			<ThemeToggle compact />
			<main className="app-main">
				<Outlet />
			</main>
			<TanstackDevtools
				config={{
					position: 'bottom-left',
				}}
				plugins={[
					{
						name: 'Tanstack Router',
						render: <TanStackRouterDevtoolsPanel />,
					},
				]}
			/>
		</ThemeProvider>
	),
});
