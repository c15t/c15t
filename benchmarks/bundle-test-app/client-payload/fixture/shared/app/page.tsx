import Link from 'next/link';

const HomePage = () => (
	<main className="mx-auto max-w-3xl px-6 py-12">
		<h1 className="mb-4 text-4xl font-semibold">
			Consent that ships with the page
		</h1>
		<p className="mb-8 text-lg">
			This route stands in for a marketing home page: a heading, a few
			paragraphs, and navigation. Only the consent setup differs between the
			arms of this benchmark.
		</p>
		<section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<article className="rounded-lg border p-4">
				<h2 className="font-semibold">Same content</h2>
				<p>Every arm renders this page unchanged.</p>
			</article>
			<article className="rounded-lg border p-4">
				<h2 className="font-semibold">Same styles</h2>
				<p>Every arm builds Tailwind 4 from the same global stylesheet.</p>
			</article>
			<article className="rounded-lg border p-4">
				<h2 className="font-semibold">Same framework</h2>
				<p>Every arm is a Next.js App Router production build.</p>
			</article>
		</section>
		<nav className="mt-8 flex gap-4">
			<Link
				className="underline"
				href="/docs"
			>
				Read the docs
			</Link>
		</nav>
	</main>
);

export default HomePage;
