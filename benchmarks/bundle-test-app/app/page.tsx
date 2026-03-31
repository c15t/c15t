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
					<Link href="/react-full">/react-full</Link> - Full React import
				</li>
				<li>
					<Link href="/react-headless">/react-headless</Link> - Headless React
					import
				</li>
				<li>
					<Link href="/react-banner-only">/react-banner-only</Link> - React
					banner only
				</li>
				<li>
					<Link href="/core-only">/core-only</Link> - Vanilla JS core only
				</li>
				<li>
					<Link href="/nextjs-basic">/nextjs-basic</Link> - Next.js provider and
					banner
				</li>
				<li>
					<Link href="/nextjs-ssr">/nextjs-ssr</Link> - Next.js SSR data path
				</li>
			</ul>
		</main>
	);
}
