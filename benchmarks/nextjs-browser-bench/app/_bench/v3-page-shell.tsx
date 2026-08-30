'use client';

import { useSetActiveUI } from '@c15t/nextjs/v3';
import Link from 'next/link';

import { type NextjsBenchScenario } from './state';

export function V3BenchmarkPageShell({
	scenario,
}: {
	scenario: NextjsBenchScenario;
}) {
	const setActiveUI = useSetActiveUI();

	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>Next.js v3 Benchmark: {scenario}</h1>
			<p>
				<Link
					id="v3-soft-nav-link"
					href="/"
				>
					Soft navigation target
				</Link>
			</p>
			<button
				id="v3-open-preferences"
				onClick={() => setActiveUI('dialog')}
				type="button"
			>
				Open Preferences
			</button>
		</main>
	);
}
