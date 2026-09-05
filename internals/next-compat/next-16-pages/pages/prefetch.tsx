import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';

const PrefetchPage = () => (
	<ConsentShell scenario="prefetch">
		<p>C15tPrefetch (from _document) on a static page.</p>
	</ConsentShell>
);

export default PrefetchPage;
