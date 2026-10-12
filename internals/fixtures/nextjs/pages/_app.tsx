import type { ConsentPageProps } from 'c15t/next/pages';
import type { AppProps } from 'next/app';

import { Consent } from '@/components/consent';

import '@/styles/globals.css';

const App = ({ Component, pageProps }: AppProps<ConsentPageProps>) => (
	// Pages without getServerSideProps resolve consent in the browser.
	<Consent state={pageProps.consent ?? {}}>
		<Component {...pageProps} />
	</Consent>
);

export default App;
