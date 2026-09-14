import {
	COMPAT_BACKEND_URL,
	COMPAT_MANIFEST_URL,
} from '@c15t/next-compat-shared/config';
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
	const state = await resolveConsent({
		backendURL: COMPAT_BACKEND_URL,
		manifestURL: COMPAT_MANIFEST_URL,
		req,
	});
	return { props: { state } };
};

const ManifestSSRPage = ({ state }: ManifestSSRPageProps) => (
	<ConsentShell
		state={state}
		scenario="manifest-ssr"
		transport="manifest"
	>
		<p>resolveConsent with manifestURL inside getServerSideProps.</p>
	</ConsentShell>
);

export default ManifestSSRPage;
