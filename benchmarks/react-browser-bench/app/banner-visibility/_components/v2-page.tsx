'use client';

import {
	ConsentBanner,
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/react';
import { useEffect, useRef } from 'react';
import { getBenchState, observeBannerVisibility } from './state';

function V2Probe() {
	const { activeUI } = useConsentManager();
	const renderRef = useRef(0);
	renderRef.current += 1;

	const state = getBenchState('v2');
	if (state) {
		state.renderCount = renderRef.current;
	}

	useEffect(() => {
		const current = getBenchState('v2');
		if (current && current.mountMs === undefined) {
			current.mountMs = performance.now();
		}
	}, []);

	useEffect(() => {
		return observeBannerVisibility('v2', activeUI);
	}, [activeUI]);

	return null;
}

export function V2BannerVisibilityPage() {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				theme: {
					motion: {
						duration: {
							fast: '1ms',
							normal: '1ms',
							slow: '1ms',
						},
					},
				},
				callbacks: {
					onError(error) {
						const state = getBenchState('v2');
						if (!state) return;
						state.errorCount += 1;
						state.errors.push(String(error));
					},
				},
			}}
		>
			<V2Probe />
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>v2 banner visibility benchmark</h1>
			</main>
			<ConsentBanner disableAnimation />
		</ConsentManagerProvider>
	);
}
