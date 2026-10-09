import { COMPAT_CONSENT_CONFIG } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ConsentRootProps } from '@c15t/nextjs';
import { resolveConsent } from '@c15t/nextjs/pages';
import type { GetServerSideProps } from 'next';

interface ManifestSSRPageProps {
	state: ConsentRootProps['state'];
}

export const getServerSideProps: GetServerSideProps<
	ManifestSSRPageProps
> = async ({ req }) => {
	const state = await resolveConsent({ config: COMPAT_CONSENT_CONFIG, req });
	// Next.js rejects undefined prop values, such as an absent GPC signal.
	const props: ManifestSSRPageProps = {
		state: JSON.parse(JSON.stringify(state)),
	};
	return { props };
};

const ManifestSSRPage = ({ state }: ManifestSSRPageProps) => (
	<ConsentShell
		state={state}
		scenario="manifest-ssr"
		transport="manifest"
	>
		<p>resolveConsent in manifest mode inside getServerSideProps.</p>
	</ConsentShell>
);

export default ManifestSSRPage;
