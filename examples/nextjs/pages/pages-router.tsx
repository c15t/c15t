// #region docs:pages-ssr title="pages/index.tsx (partial)"
import type { ConsentRootProps } from 'c15t/next';
import { resolveConsent } from 'c15t/next/pages';
import type { GetServerSideProps } from 'next';

import { consentConfig } from '@/c15t.config';

interface PageProps {
	initialConsent: ConsentRootProps['state'];
}

export const getServerSideProps: GetServerSideProps<PageProps> = async ({
	req,
}) => {
	const initialConsent = await resolveConsent({ config: consentConfig, req });
	// Next.js rejects undefined prop values, such as an absent GPC signal.
	return {
		props: {
			initialConsent: JSON.parse(
				JSON.stringify(initialConsent)
			) as PageProps['initialConsent'],
		},
	};
};
// #endregion docs:pages-ssr

export { default } from '@/components/pages-router-demo';
