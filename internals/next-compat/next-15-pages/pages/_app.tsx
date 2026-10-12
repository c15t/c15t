import type { AppProps } from 'next/app';

import '@c15t/nextjs/styles.css';

/**
 * Deliberately minimal. Each page mounts its own `ConsentShell` so the
 * scenario (client, prefetch, ssr) is chosen per route.
 */
const CompatApp = ({ Component, pageProps }: AppProps) => (
	<Component {...pageProps} />
);

export default CompatApp;
