import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/nextjs';
import { ConsentManagerClient } from './ConsentManager.client';

export function ConsentManager({ children }: { children: React.ReactNode }) {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'c15t',
				backendURL: '/api/c15t',
				consentCategories: ['necessary', 'marketing'],
				ignoreGeoLocation: true,
			}}
		>
			<CookieBanner />
			<ConsentManagerDialog />
			{/* Next.js App Directory does not support serializing stuff like callbacks, so we have to put them in a client component */}
			<ConsentManagerClient>{children}</ConsentManagerClient>
		</ConsentManagerProvider>
	);
}
