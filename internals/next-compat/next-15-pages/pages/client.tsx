import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';

const ClientPage = () => (
	<ConsentShell scenario="client">
		<p>Client-only init on a static page.</p>
	</ConsentShell>
);

export default ClientPage;
