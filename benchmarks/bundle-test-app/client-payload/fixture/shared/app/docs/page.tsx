import Link from 'next/link';

const steps = [
	'Install the package and import the stylesheet once.',
	'Mount the consent wrapper in the root layout.',
	'Render the banner and the dialog.',
	'Gate scripts and embeds on the recorded choice.',
];

const DocsPage = () => (
	<main className="mx-auto max-w-3xl px-6 py-12">
		<p className="mb-2 text-sm">
			<Link href="/">Home</Link> / Docs / Quickstart
		</p>
		<h1 className="mb-4 text-3xl font-semibold">Quickstart</h1>
		<p className="mb-4 text-lg">
			A documentation-shaped route with a list and a code block.
		</p>
		<ol className="mb-4 list-decimal pl-6">
			{steps.map((step) => (
				<li key={step}>{step}</li>
			))}
		</ol>
		<pre className="overflow-x-auto rounded-lg border p-4 font-mono text-sm">
			<code>@import &apos;tailwindcss&apos;;</code>
		</pre>
	</main>
);

export default DocsPage;
