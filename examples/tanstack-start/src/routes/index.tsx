import { createFileRoute } from '@tanstack/react-router';
import { useConsent } from 'c15t/tanstack-start';

const HomePage = () => {
	const measurement = useConsent('measurement');
	return (
		<main>
			<h1>c15t with TanStack Start</h1>
			<p>
				PostHog{' '}
				{measurement ? 'is allowed to load' : 'waits for measurement consent'}.
			</p>
		</main>
	);
};

export const Route = createFileRoute('/')({ component: HomePage });
