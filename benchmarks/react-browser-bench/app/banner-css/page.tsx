/**
 * CSS delivery page. The default build imports the aggregate stylesheet; the
 * `C15T_CSS=styles` build imports only the banner's component stylesheets
 * (see next.config.ts). Both render the same full default theme on the server
 * and disable automatic styles, so the arms differ only in external CSS.
 */
import 'bench-css-entry';
import { ConsentTheme } from '@c15t/react';
import { defaultTheme } from '@c15t/ui/theme';

import { ReactBenchmarkProvider } from '../_bench/provider';

const theme = {
	...defaultTheme,
	motion: {
		...defaultTheme.motion,
		duration: { fast: '1ms', normal: '1ms', slow: '1ms' },
	},
};

const BannerCssPage = () => (
	<>
		<ConsentTheme theme={theme} />
		<ReactBenchmarkProvider
			scenario="banner-css"
			styles={false}
			theme={theme}
		>
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>React Banner CSS Experiment</h1>
				<p>CSS delivery is selected at build time with C15T_CSS.</p>
			</main>
		</ReactBenchmarkProvider>
	</>
);

export default BannerCssPage;
