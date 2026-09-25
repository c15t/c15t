// A long static article, so the consent-dependent part of the response is
// about as large as the c15t docs site's docs page (~100 KB of HTML and RSC
// payload after the shell).
const sections = Array.from({ length: 90 }, (_, index) => index + 1);

const Docs = () => (
	<main
		className="mx-auto max-w-3xl p-8"
		data-bench-content=""
	>
		<h1 className="mb-4 text-3xl font-semibold">Quickstart</h1>
		<p className="mb-4 text-lg">
			Import the prebuilt component stylesheet in your app-level CSS entrypoint,
			then resolve consent on the server.
		</p>
		{sections.map((i) => [
			<h2
				className="mt-8 mb-3 text-2xl font-semibold"
				key={`h${i}`}
			>
				{`Section ${i}: configure consent step ${i}`}
			</h2>,
			<p
				className="mb-4"
				key={`a${i}`}
			>
				{`Step ${i} explains how the consent manager resolves policy for a visitor, which categories the banner offers, and how scripts wait for a recorded choice before they load. The server reads request cookies and geography headers, the manifest route caches public policy data, and the provider applies the result.`}
			</p>,
			<pre
				className="mb-4 overflow-x-auto rounded border p-4 font-mono text-sm"
				key={`c${i}`}
			>
				{`import { resolveConsent } from 'c15t/next/server';
const state${i} = await resolveConsent({ config: consentConfig });
// step ${i}: pass the state to ConsentRoot`}
			</pre>,
			<p
				className="mb-4"
				key={`b${i}`}
			>
				{`A returning visitor with a stored choice sees no banner. A new visitor under an opt-in rule sees the banner, and measurement scripts stay blocked until they accept. Paragraph ${i} continues with explanatory text so the route carries a realistic amount of documentation content.`}
			</p>,
		])}
	</main>
);

export default Docs;
