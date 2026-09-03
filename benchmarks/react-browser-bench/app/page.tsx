import Link from 'next/link';

const HomePage = () => (
	<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
		<h1>@c15t/react Browser Bench</h1>
		<ul>
			<li>
				<Link href="/full-ui">/full-ui</Link>
			</li>
			<li>
				<Link href="/headless">/headless</Link>
			</li>
			<li>
				<Link href="/banner-css">/banner-css</Link>
			</li>
			<li>
				<Link href="/css-banner-modules">/css-banner-modules</Link>
			</li>
			<li>
				<Link href="/banner-visibility">/banner-visibility</Link>
			</li>
		</ul>
	</main>
);

export default HomePage;
