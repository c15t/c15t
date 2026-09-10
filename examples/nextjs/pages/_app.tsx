import type { ConsentBoundaryProps } from 'c15t/next';
import type { AppProps } from 'next/app';

import { Consent } from '../components/consent';

import 'c15t/next/styles.css';
import '../app/styles.css';

export interface ConsentPageProps {
	initialConsent?: ConsentBoundaryProps['config'];
}

const App = ({ Component, pageProps }: AppProps<ConsentPageProps>) => (
	<Consent config={pageProps.initialConsent ?? {}}>
		<Component {...pageProps} />
	</Consent>
);

export default App;
