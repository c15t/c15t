import {
	COMPAT_BACKEND_URL,
	COMPAT_MANIFEST_URL,
} from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import type { ConsentBoundaryProps } from '@c15t/nextjs';
import { prefetchInitialConsent } from '@c15t/nextjs/pages';
import type { GetServerSideProps } from 'next';

interface ManifestSSRPageProps {
	config: ConsentBoundaryProps['config'];
}

export const getServerSideProps: GetServerSideProps<
	ManifestSSRPageProps
> = async ({ req }) => {
	const config = await prefetchInitialConsent({
		backendURL: COMPAT_BACKEND_URL,
		manifestURL: COMPAT_MANIFEST_URL,
		req,
	});
	return { props: { config } };
};

const ManifestSSRPage = ({ config }: ManifestSSRPageProps) => (
	<ConsentShell
		config={config}
		scenario="manifest-ssr"
		transport="manifest"
	>
		<p>prefetchInitialConsent with manifestURL inside getServerSideProps.</p>
	</ConsentShell>
);

export default ManifestSSRPage;
