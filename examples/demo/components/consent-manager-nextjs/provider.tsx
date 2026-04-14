'use client';

import type { ConsentManagerProps } from '@c15t/nextjs';
import {
	ConsentDialog,
	ConsentDialogTrigger,
	ConsentManagerProvider,
} from '@c15t/nextjs';
import CookieBanner from './cookie-banner';

const BACKEND_URL = 'https://minecraft-eu-west-1-mewwing.c15t.xyz';

export default function ({ children, ssrData }: ConsentManagerProps) {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'c15t',
				backendURL: BACKEND_URL,
				ssrData,
				consentCategories: ['necessary', 'marketing', 'measurement'],
				storageConfig: {
					crossSubdomain: true,
				},
				legalLinks: {
					privacyPolicy: {
						href: '/legal/privacy-policy',
					},
					termsOfService: {
						href: '/legal/terms-of-service',
					},
				},
			}}
		>
			<CookieBanner />
			<ConsentDialog />
			<ConsentDialogTrigger />
			{children}
		</ConsentManagerProvider>
	);
}
