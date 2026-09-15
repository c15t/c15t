import type { ConsentRootProps } from 'c15t/next';
import type { AppProps } from 'next/app';

import { Consent } from '../components/consent';

import 'c15t/next/styles.css';
import '../app/styles.css';

export interface ConsentPageProps {
	initialConsent?: ConsentRootProps['state'];
}

const App = ({ Component, pageProps }: AppProps<ConsentPageProps>) => (
	<Consent state={pageProps.initialConsent ?? {}}>
		<Component {...pageProps} />
	</Consent>
);

export default App;
