import Link from 'next/link';

const HomePage = () => (
	<main className="page">
		<h1>Consent that ships with the page</h1>
		<p className="lede">
			This route stands in for a marketing home page: a heading, a few
			paragraphs, and navigation. The consent banner, its custom theme, and the
			deferred preference dialog come from the packed c15t artifacts.
		</p>
		<section className="cards">
			<article>
				<h2>Server resolution</h2>
				<p>
					The layout awaits the cached manifest before rendering the page inside
					a Suspense boundary.
				</p>
			</article>
			<article>
				<h2>Aggregate styles</h2>
				<p>The global stylesheet imports the documented aggregate CSS.</p>
			</article>
			<article>
				<h2>Deferred dialog</h2>
				<p>The preference dialog loads when a visitor opens it.</p>
			</article>
		</section>
		<nav className="links">
			<Link href="/docs">Read the docs</Link>
		</nav>
	</main>
);

export default HomePage;
