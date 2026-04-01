import Link from 'next/link';

export default function HomePage() {
	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>@c15t/react Browser Bench</h1>
			<ul>
				<li>
					<Link href="/full-ui">/full-ui</Link>
				</li>
				<li>
					<Link href="/headless">/headless</Link>
				</li>
				<li>
					<Link href="/vanilla-core">/vanilla-core</Link>
				</li>
			</ul>
		</main>
	);
}
