import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';

const ManifestPage = () => (
	<ConsentShell
		scenario="manifest"
		transport="manifest"
	>
		<p>Manifest transport in the browser on a static page.</p>
	</ConsentShell>
);

export default ManifestPage;
