import Link from 'next/link';

const HomePage = () => (
	<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
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
			<li>
				<Link href="/v3-client">/v3-client</Link>
			</li>
			<li>
				<Link href="/v3-manifest-client">/v3-manifest-client</Link>
			</li>
			<li>
				<Link href="/v3-ssr">/v3-ssr</Link>
			</li>
			<li>
				<Link href="/v3-manifest-ssr">/v3-manifest-ssr</Link>
			</li>
		</ul>
	</main>
);

export default HomePage;
