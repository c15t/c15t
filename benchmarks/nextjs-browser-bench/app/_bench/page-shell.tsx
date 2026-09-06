'use client';

import { useSetActiveUI } from '@c15t/nextjs';
import Link from 'next/link';

import type { NextjsBenchScenario } from './state';

export const BenchmarkPageShell = ({
	scenario,
}: {
	scenario: NextjsBenchScenario;
}) => {
	const setActiveUI = useSetActiveUI();

	return (
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>Next.js benchmark: {scenario}</h1>
			<p>
				<Link
					id="soft-nav-link"
					href="/"
				>
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
};
