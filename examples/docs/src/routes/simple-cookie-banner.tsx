import { ConsentManagerProvider, CookieBanner } from '@c15t/react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/simple-cookie-banner')({
	component: SimpleCookieBanner,
});

function SimpleCookieBanner() {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				consentCategories: [
					'experience',
					'marketing',
					'functionality',
					'necessary',
				],
			}}
		>
			<CookieBanner />
		</ConsentManagerProvider>
	);
}
