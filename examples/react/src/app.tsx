import { useConsent } from 'c15t/react';

export const App = () => {
	const measurement = useConsent('measurement');
	return (
		<main>
			<h1>c15t with React</h1>
			<p>
				PostHog{' '}
				{measurement ? 'is allowed to load' : 'waits for measurement consent'}.
			</p>
		</main>
	);
};
