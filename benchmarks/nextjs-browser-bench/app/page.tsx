import Link from 'next/link';

export default function HomePage() {
	return (
		<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
			<h1>@c15t/nextjs Browser Bench</h1>
			<ul>
				<li>
					<Link href="/client">/client</Link>
				</li>
				<li>
					<Link href="/ssr">/ssr</Link>
				</li>
				<li>
					<Link href="/prefetch">/prefetch</Link>
				</li>
			</ul>
		</main>
	);
}
