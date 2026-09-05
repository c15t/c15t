/**
 * Zero-consent baseline page (Start host): identical app shell, no c15t.
 * Measures the page floor so `consentTaxMs = bannerVisible − pageFloor`
 * can be derived. Probe stub mirrors the real probe's settle semantics.
 */
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { getState } from '../bench/state';

const BaselineProbe = () => {
	useEffect(() => {
		const state = getState('baseline');
		if (!state) {
			return;
		}
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const now = performance.now();
				if (state.bannerReadyMs === undefined) {
					state.bannerReadyMs = now;
					state.bannerVisibleMs = now;
				}
				state.activeUI = 'none';
			});
		});
	}, []);
	return null;
};

const BaselinePage = () => (
	<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
		<BaselineProbe />
		<h1>Zero-consent baseline</h1>
		<p>Identical app shell, no consent library.</p>
		<button
			id="baseline-noop"
			type="button"
		>
			No-op interaction target
		</button>
	</main>
);

export const Route = createFileRoute('/baseline')({
	component: BaselinePage,
});
