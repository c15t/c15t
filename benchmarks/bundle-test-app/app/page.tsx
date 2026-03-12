import Link from 'next/link';

export default function HomePage() {
	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>Bundle Size Test App</h1>
			<p>
				Run <code>bun run analyze</code> to see bundle sizes for each import
				pattern.
			</p>

			<h2>Test Pages</h2>
			<ul style={{ lineHeight: 2 }}>
				<li>
					<Link href="/full">/full</Link> - Full import (all components)
				</li>
				<li>
					<Link href="/headless">/headless</Link> - Headless only (custom UI)
				</li>
				<li>
					<Link href="/banner-only">/banner-only</Link> - Just CookieBanner
				</li>
				<li>
					<Link href="/core-only">/core-only</Link> - Vanilla JS core only
				</li>
			</ul>
		</main>
	);
}
