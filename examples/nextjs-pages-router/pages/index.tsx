// #region docs:pages-ssr title="pages/index.tsx (partial)"
import type { ConsentRootProps } from 'c15t/next';
import { resolveConsent } from 'c15t/next/pages';
import type { GetServerSideProps } from 'next';

import { consentOptions } from '@/c15t.server';

interface PageProps {
	initialConsent: ConsentRootProps['state'];
}

export const getServerSideProps = (async ({ req }) => {
	const state = await resolveConsent({ ...consentOptions, req });
	// Next.js rejects undefined prop values, such as an absent GPC signal.
	const initialConsent: PageProps['initialConsent'] = JSON.parse(
		JSON.stringify(state)
	);

	return { props: { initialConsent } };
}) satisfies GetServerSideProps<PageProps>;
// #endregion docs:pages-ssr

const Page = () => (
	<main>
		<h1>c15t with the Next.js Pages Router</h1>
		<p>
			This page resolves consent in getServerSideProps, so the banner is part of
			the server HTML. PostHog loads once you allow measurement.
		</p>
	</main>
);

export default Page;
