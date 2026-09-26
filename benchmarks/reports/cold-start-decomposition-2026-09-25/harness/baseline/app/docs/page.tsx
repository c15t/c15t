import Link from 'next/link';

const steps = [
	'Install the package and import the aggregate stylesheet once.',
	'Resolve consent on the server from the cached manifest.',
	'Pass the resolved state to the provider as prefetch.',
	'Render the banner and the dialog; the dialog loads on demand.',
	'Gate scripts and embeds on the recorded choice.',
];

const DocsPage = () => (
	<main className="page docs">
		<p className="breadcrumb">
			<Link href="/">Home</Link> / Docs / Quickstart
		</p>
		<h1>Quickstart</h1>
		<p className="lede">
			A documentation-shaped route with more text, a list, and a code block, so
			its paint and stylesheet profile differ from the home page.
		</p>
		<ol>
			{steps.map((step) => (
				<li key={step}>{step}</li>
			))}
		</ol>
		<pre>
			<code>{`import { resolveConsent } from 'c15t/next/server';

const state = await resolveConsent({
  backendURL: '/api/c15t',
  manifestURL: '/api/c15t/manifest',
});`}</code>
		</pre>
		<p>
			Returning visitors keep their stored choice. The banner stays hidden and
			the preference dialog remains one click away.
		</p>
	</main>
);

export default DocsPage;
