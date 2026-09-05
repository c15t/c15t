import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { toWebHeaders } from '@c15t/next-compat-shared/fixture/node-adapter';
import type { ConsentBoundaryProps } from '@c15t/nextjs';
import { prefetchInitialConsent } from '@c15t/nextjs/server';
import type { GetServerSideProps } from 'next';

interface SSRPageProps {
	config: ConsentBoundaryProps['config'];
}

/**
 * Pages Router SSR. `@c15t/nextjs/server` reads `next/headers`, which does
 * not exist here, so the request context is supplied through the helper's
 * `request` adapter from the `getServerSideProps` request.
 */
export const getServerSideProps: GetServerSideProps<SSRPageProps> = async ({
	req,
}) => {
	const headers = toWebHeaders(req.headers);
	const config = await prefetchInitialConsent({
		backendURL: COMPAT_BACKEND_URL,
		request: {
			cookies: () => ({ toString: () => req.headers.cookie ?? '' }),
			headers: () => headers,
		},
	});
	return { props: { config } };
};

const SSRPage = ({ config }: SSRPageProps) => (
	<ConsentShell
		config={config}
		scenario="ssr"
	>
		<p>prefetchInitialConsent inside getServerSideProps.</p>
	</ConsentShell>
);

export default SSRPage;
