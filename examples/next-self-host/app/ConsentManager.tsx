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
				store: {
					trackingBlockerConfig: {
						disableAutomaticBlocking: true,
					},
				},
			}}
		>
			<CookieBanner />
			<ConsentManagerDialog />
			{/* 
      The provider is SSR, In Next.js App Directory we need a seperate client compoonent.
      This is because options like callbacks and scripts need to be client-side only as they can't be seralized.
      For a fully client-side solution, you can use the <ClientConsentManagerProvider /> component.
      */}
			<ConsentManagerClient>{children}</ConsentManagerClient>
		</ConsentManagerProvider>
	);
}
