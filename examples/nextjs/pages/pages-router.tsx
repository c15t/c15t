// #region docs:pages-ssr title="pages/index.tsx (partial)"
import type { ConsentRootProps } from 'c15t/next';
import { resolveConsent } from 'c15t/next/pages';
import type { GetServerSideProps } from 'next';

import { consentConfig } from '@/c15t.config';

interface PageProps {
	initialConsent: ConsentRootProps['state'];
}

export const getServerSideProps = (async ({ req }) => {
	const state = await resolveConsent({ config: consentConfig, req });
	// Next.js rejects undefined prop values, such as an absent GPC signal.
	const initialConsent: PageProps['initialConsent'] = JSON.parse(
		JSON.stringify(state)
	);

	return { props: { initialConsent } };
}) satisfies GetServerSideProps<PageProps>;
// #endregion docs:pages-ssr

export { default } from '@/components/pages-router-demo';
