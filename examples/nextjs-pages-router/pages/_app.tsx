// #region docs:pages-app title="pages/_app.tsx"
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
} from 'c15t/next';
import type { ConsentPageProps } from 'c15t/next/pages';
import type { AppProps } from 'next/app';

import '@/styles/globals.css';

const App = ({ Component, pageProps }: AppProps<ConsentPageProps>) => (
	// Pages without getServerSideProps resolve consent in the browser.
	<ConsentRoot state={pageProps.consent}>
		<Component {...pageProps} />
		<ConsentBanner />
		<ConsentDialog />
		<footer>
			<ConsentDialogLink>Privacy settings</ConsentDialogLink>
		</footer>
	</ConsentRoot>
);

export default App;
// #endregion docs:pages-app
