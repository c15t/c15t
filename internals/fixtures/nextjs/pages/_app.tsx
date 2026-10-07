import type { ConsentRootProps } from 'c15t/next';
import type { AppProps } from 'next/app';

import { Consent } from '@/components/consent';

import '@/styles/globals.css';

export interface ConsentPageProps {
	initialConsent?: ConsentRootProps['state'];
}

const App = ({ Component, pageProps }: AppProps<ConsentPageProps>) => (
	// Pages without getServerSideProps resolve consent in the browser.
	<Consent state={pageProps.initialConsent ?? {}}>
		<Component {...pageProps} />
	</Consent>
);

export default App;
