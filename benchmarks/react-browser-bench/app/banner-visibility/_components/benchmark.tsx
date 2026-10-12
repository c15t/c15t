'use client';

import { offline } from '@c15t/react';
import { ConsentBanner } from '@c15t/react/consent-banner';
import { useActiveUI } from '@c15t/react/hooks';
import { ConsentProvider } from '@c15t/react/provider';
import { useEffect, useRef } from 'react';

import { getBenchState, observeBannerVisibility } from './state';

const BENCHMARK_POLICY = {
	id: 'benchmark-opt-in',
	match: { isDefault: true },
	model: 'opt-in' as const,
	prompt: 'choice' as const,
};

const Probe = () => {
	const activeUI = useActiveUI();
	const renderRef = useRef(0);

	useEffect(() => {
		renderRef.current += 1;
		const state = getBenchState();
		if (state) {
			state.renderCount = renderRef.current;
		}
	});

	useEffect(() => {
		const current = getBenchState();
		if (current && current.mountMs === undefined) {
			current.mountMs = performance.now();
		}
	}, []);

	useEffect(() => observeBannerVisibility(activeUI ?? 'none'), [activeUI]);

	return null;
};

export const BannerVisibilityBenchmark = () => (
	<ConsentProvider
		options={{
			mode: offline({ policyRules: [BENCHMARK_POLICY] }),
			persistence: false,
			theme: {
				motion: {
					duration: { fast: '1ms', normal: '1ms', slow: '1ms' },
				},
			},
		}}
	>
		<Probe />
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>Banner visibility benchmark</h1>
		</main>
		<ConsentBanner disableAnimation />
	</ConsentProvider>
);
