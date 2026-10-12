// Same shape as the c15t docs site root layout: global CSS first, next-themes,
// then the consent layer around the page. Only components/arm.tsx differs
// between arms.
import './globals.css';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

import { ConsentLayer } from '../components/arm';
import { ConsentFooter } from '../components/consent-manager';
import { SpeedInsightsStandIn } from '../components/speed-insights-stand-in';

const Layout = ({ children }: { children: ReactNode }) => (
	<html
		lang="en"
		suppressHydrationWarning
	>
		<body className="flex min-h-screen flex-col">
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				enableSystem
				disableTransitionOnChange
			>
				<ConsentLayer>
					{children}
					<footer className="mx-auto max-w-3xl p-8">
						<ConsentFooter />
					</footer>
				</ConsentLayer>
			</ThemeProvider>
			<SpeedInsightsStandIn />
		</body>
	</html>
);

export default Layout;
