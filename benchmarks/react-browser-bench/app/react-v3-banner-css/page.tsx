'use client';

/**
 * CSS-experiment page: v3 full surface with CSS actually loaded (unlike the
 * other react arms, which ship class maps without stylesheets).
 *
 * Two builds of this same page isolate the CSS system:
 * - control (default): `bench-css-entry` -> `@c15t/react/v3/styles.css`
 *   monolith (current React delivery: every surface's CSS, always)
 * - treatment (C15T_CSS=styles): the consent-banner style-map is aliased to
 *   the `@c15t/ui/styles/v3` shim (per-component CSS Modules, the Vue approach);
 *   no monolith import — CSS follows the components actually rendered.
 * JS is otherwise byte-identical between builds.
 */
import 'bench-css-entry';
import { ReactV3BenchmarkProvider } from '../_bench/v3-provider';

const ReactV3BannerCssPage = () => {
	return (
		<ReactV3BenchmarkProvider scenario="react-v3-banner-css">
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>React v3 Banner CSS Experiment</h1>
				<p>CSS system selected at build time via C15T_CSS.</p>
			</main>
		</ReactV3BenchmarkProvider>
	);
};

export default ReactV3BannerCssPage;
