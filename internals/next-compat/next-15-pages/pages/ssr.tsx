import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ConsentBoundaryProps } from '@c15t/nextjs';
import { prefetchInitialConsent } from '@c15t/nextjs/pages';
import type { GetServerSideProps } from 'next';

interface SSRPageProps {
	config: ConsentBoundaryProps['config'];
}

/**
 * Pages Router SSR. `@c15t/nextjs/pages` reads the request from the
 * `getServerSideProps` `req` instead of `next/headers`.
 */
export const getServerSideProps: GetServerSideProps<SSRPageProps> = async ({
	req,
}) => {
	const config = await prefetchInitialConsent({
		backendURL: COMPAT_BACKEND_URL,
		req,
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
