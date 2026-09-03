'use client';

/**
 * CSS-experiment page. The control build loads the monolith stylesheet. The
 * treatment build aliases the banner style map to component CSS modules.
 */
import 'bench-css-entry';
import { ReactBenchmarkProvider } from '../_bench/provider';

const BannerCssPage = () => (
	<ReactBenchmarkProvider scenario="banner-css">
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>React Banner CSS Experiment</h1>
			<p>CSS delivery is selected at build time with C15T_CSS.</p>
		</main>
	</ReactBenchmarkProvider>
);

export default BannerCssPage;
