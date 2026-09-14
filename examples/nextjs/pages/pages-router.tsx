import type { ConsentRootProps } from 'c15t/next';
import { resolveConsent } from 'c15t/next/pages';
import type { GetServerSideProps } from 'next';

import { consentConfig, demoLocation } from '../c15t.config';

interface PageProps {
	initialConsent: ConsentRootProps['state'];
}

export const getServerSideProps: GetServerSideProps<PageProps> = async ({
	req,
}) => {
	const initialConsent = await resolveConsent({
		config: consentConfig,
		...demoLocation,
		req,
	});
	// Pages Router props must omit undefined values, including absent privacy signals.
	return {
		props: {
			initialConsent: JSON.parse(
				JSON.stringify(initialConsent)
			) as PageProps['initialConsent'],
		},
	};
};

const Page = () => (
	<p className="route-note">
		Pages Router resolves consent in getServerSideProps and restores it in the
		browser.
	</p>
);

export default Page;
