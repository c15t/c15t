import '@/styles/globals.css';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/nextjs/pages';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
	return (
		<ConsentManagerProvider
			initialData={pageProps.initialC15TData}
			options={{
				mode: 'c15t',
				backendURL: '/api/c15t',
				consentCategories: ['necessary', 'marketing'],
				ignoreGeoLocation: true,
				callbacks: {
					onBannerFetched: (response) => {
						console.log('onBannerFetched', response);
					},
					onConsentSet: (response) => {
						console.log('onConsentSet', response);
					},
				},
			}}
		>
			<CookieBanner />
			<ConsentManagerDialog />
			<Component {...pageProps} />
		</ConsentManagerProvider>
	);
}
