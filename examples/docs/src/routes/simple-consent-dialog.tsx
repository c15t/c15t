import { ConsentManagerDialog, ConsentManagerProvider } from '@c15t/react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/simple-consent-dialog')({
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
			<ConsentManagerDialog open={true} />
		</ConsentManagerProvider>
	);
}
