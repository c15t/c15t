'use client';

import { useConsentManager } from '@c15t/nextjs';
import Link from 'next/link';
import { type NextjsBenchScenario } from './state';

export function BenchmarkPageShell({
	scenario,
}: {
	scenario: NextjsBenchScenario;
}) {
	const { setActiveUI } = useConsentManager();

	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>Next.js Benchmark: {scenario}</h1>
			<p>
				<Link id="soft-nav-link" href="/">
					Soft navigation target
				</Link>
			</p>
			<button
				id="open-preferences"
				onClick={() => setActiveUI('dialog')}
				type="button"
			>
				Open Preferences
			</button>
		</main>
	);
}
