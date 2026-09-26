'use client';

/**
 * CSS delivery page. The default build imports the aggregate stylesheet; the
 * `C15T_CSS=styles` build imports only the banner's component stylesheets
 * (see next.config.ts). Both pass the full default theme, so the provider
 * writes every token inline and the arms differ only in stylesheet delivery.
 */
import 'bench-css-entry';
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
	<ReactBenchmarkProvider
		scenario="banner-css"
		theme={theme}
	>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React Banner CSS Experiment</h1>
			<p>CSS delivery is selected at build time with C15T_CSS.</p>
		</main>
	</ReactBenchmarkProvider>
);

export default BannerCssPage;
