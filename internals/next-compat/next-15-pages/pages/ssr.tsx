import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ConsentRootProps } from '@c15t/nextjs';
import { resolveConsent } from '@c15t/nextjs/pages';
import type { GetServerSideProps } from 'next';

interface SSRPageProps {
	state: ConsentRootProps['state'];
}

/**
 * Pages Router SSR. `@c15t/nextjs/pages` reads the request from the
 * `getServerSideProps` `req` instead of `next/headers`.
 */
export const getServerSideProps: GetServerSideProps<SSRPageProps> = async ({
	req,
}) => {
	const state = await resolveConsent({
		backendURL: COMPAT_BACKEND_URL,
		req,
	});
	return { props: { state } };
};

const SSRPage = ({ state }: SSRPageProps) => (
	<ConsentShell
		state={state}
		scenario="ssr"
	>
		<p>resolveConsent inside getServerSideProps.</p>
	</ConsentShell>
);

export default SSRPage;
