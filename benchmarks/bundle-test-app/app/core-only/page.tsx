'use client';

import { createConsentKernel, createHostedTransport } from '@c15t/core';
import { useMemo } from 'react';

/**
 * `/core-only`: the headless kernel plus hosted transport with no React
 * adapter. `bundleBudgets` carries a `core-only` route budget; this page
 * gives it a route to measure. Kernel construction is pure, so it can run
 * inside a memo.
 */
const CoreOnlyPage = () => {
	const kernel = useMemo(
		() =>
			createConsentKernel({
				transport: createHostedTransport({ backendURL: '/api/bench-consent' }),
			}),
		[]
	);

	return (
		<main>
			<h1>core-only</h1>
			<p>Kernel revision: {kernel.getSnapshot().revision}</p>
		</main>
	);
};

export default CoreOnlyPage;
