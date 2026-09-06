import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';

const ManifestGeoPage = () => (
	<ConsentShell
		scenario="manifest-geo"
		transport="manifest-geo"
	>
		<p>
			Same-origin init from the cached manifest, with geo, on a static page.
		</p>
	</ConsentShell>
);

export default ManifestGeoPage;
