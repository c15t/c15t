import { useSetActiveUI } from '@c15t/tanstack-start';
import { Link } from '@tanstack/react-router';

import type { TanstackBenchScenario } from './state';

/**
 * Same DOM as the Next arm's shell: one heading, the soft-navigation link,
 * and the preferences button the repeat-visitor arm clicks.
 */
export const BenchmarkPageShell = ({
	scenario,
}: {
	scenario: TanstackBenchScenario;
}) => {
	const setActiveUI = useSetActiveUI();

	return (
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>TanStack Start benchmark: {scenario}</h1>
			<p>
				<Link
					id="soft-nav-link"
					to="/"
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
